import { randomUUID } from "crypto";
import { ConnectionRepository } from "../../domain/model/connection/connectionRepository.js";
import { Connection } from "../../domain/model/connection/connection.js";
import { MatchmakingRepository } from "../../domain/model/matchmaking/matchmakingRepository.js";
import { GameRepository } from "../../domain/model/game/gameRepository.js";
import { ImageGenerationService } from "../../domain/model/imageGeneration/imageGenerationService.js";
import { NotificationService } from "../../domain/model/notification/notificationService.js";
import { Player } from "../../domain/model/player/player.js";
import { PublicPlayer } from "../../domain/model/player/publicPlayer.js";
import { Game } from "../../domain/model/game/game.js";
import { RouletteSlot } from "../../domain/model/matchmaking/rouletteSlot.js";
import { Deck } from "../../domain/model/card/deck.js";
import { buildPrompt } from "../../domain/model/matchmaking/promptBuilder.js";
import {
  THEME_SLOT_KEYS,
  THEME_ITEMS,
  pickRandomItem,
} from "../../domain/model/matchmaking/themeData.js";

const AVATARS = ["😊", "🐱", "🐶", "🐰"];
const PROMPT_LOG_LIMIT = 180;

export class JoinGameUseCase {
  constructor(
    private connectionRepo: ConnectionRepository,
    private matchmakingRepo: MatchmakingRepository,
    private gameRepo: GameRepository,
    private notificationService: NotificationService,
    private imageGenerationService: ImageGenerationService
  ) {}

  async execute(connectionId: string, playerName: string): Promise<void> {
    await this.connectionRepo.save(new Connection(connectionId, playerName, null));
    await this.matchmakingRepo.addPlayer(connectionId, playerName);

    const waiting = await this.matchmakingRepo.getWaitingPlayers();

    let slots = await this.matchmakingRepo.getRouletteState();
    let newSlot: RouletteSlot | null = null;
    if (slots.length < waiting.length && slots.length < 4) {
      const key = THEME_SLOT_KEYS[slots.length];
      newSlot = new RouletteSlot(key, pickRandomItem(key), slots.length);
      slots = [...slots, newSlot];
      await this.matchmakingRepo.saveRouletteState(slots);
    }

    if (waiting.length < 4) {
      await Promise.all(
        waiting.map((w) =>
          this.notificationService.sendToConnection(w.connectionId, {
            type: "waiting",
            waitingCount: waiting.length,
            playerNames: waiting.map((p) => p.playerName),
            decidedSlots: slots,
            newSlot,
            slotCandidates: THEME_ITEMS,
          })
        )
      );
      return;
    }

    const matchedPlayers = waiting.slice(0, 4);

    // Remove matched players from queue immediately to prevent race conditions
    // (e.g., 5th player joining during image generation seeing stale queue)
    await Promise.all([
      ...matchedPlayers.map((w) =>
        this.matchmakingRepo.removePlayer(w.connectionId)
      ),
      this.matchmakingRepo.deleteRouletteState(),
    ]);

    await Promise.all(
      matchedPlayers.map((w) =>
        this.notificationService.sendToConnection(w.connectionId, {
          type: "waiting",
          waitingCount: 4,
          playerNames: matchedPlayers.map((p) => p.playerName),
          decidedSlots: slots,
          newSlot,
          slotCandidates: THEME_ITEMS,
        })
      )
    );

    // --- Image generation phase ---
    await Promise.all(
      matchedPlayers.map((w) =>
        this.notificationService.sendToConnection(w.connectionId, {
          type: "generating",
        })
      )
    );

    const gameId = randomUUID();

    const prompt = buildPrompt(slots);
    const promptPreview =
      prompt.length > PROMPT_LOG_LIMIT
        ? `${prompt.slice(0, PROMPT_LOG_LIMIT)}...`
        : prompt;

    console.info(
      JSON.stringify({
        event: "image_generation_start",
        gameId,
        promptLength: prompt.length,
        promptPreview,
      })
    );

    try {
      const imageUrls = await this.imageGenerationService.generate(prompt, gameId);
      console.info(
        JSON.stringify({
          event: "image_generation_done",
          gameId,
          imageUrlCount: imageUrls.length,
        })
      );

      await Promise.all(
        matchedPlayers.map((w) =>
          this.notificationService.sendToConnection(w.connectionId, {
            type: "images_ready",
            imageUrls,
          })
        )
      );

      // --- Game start phase ---
      let players: Player[] = matchedPlayers.map(
        (w, i) =>
          new Player(w.connectionId, w.playerName, AVATARS[i], i, [], null)
      );

      players = Deck.deal(players);

      const game = new Game(gameId, "playing", players, 0, 0, 1);

      await this.gameRepo.create(game);

      await Promise.all(
        matchedPlayers.map((w) =>
          this.connectionRepo.updateGameId(w.connectionId, gameId)
        )
      );

      const publicPlayers = players.map(
        (p) =>
          new PublicPlayer(
            p.name,
            p.avatar,
            p.seatIndex,
            p.hand.length,
            p.finishedOrder
          )
      );

      await Promise.all(
        players.map((player) =>
          this.notificationService.sendToConnection(player.connectionId, {
            type: "game_start",
            gameId,
            yourSeatIndex: player.seatIndex,
            yourHand: player.hand,
            players: publicPlayers,
            currentTurnSeat: game.currentTurnIndex,
          })
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(
        JSON.stringify({
          event: "game_creation_failed",
          gameId,
          errorMessage,
        })
      );

      // Recovery: re-add players to matchmaking queue
      await Promise.all(
        matchedPlayers.map((w) =>
          this.matchmakingRepo.addPlayer(w.connectionId, w.playerName)
        )
      );
      console.info(
        JSON.stringify({
          event: "players_recovered_to_queue",
          gameId,
          playerCount: matchedPlayers.length,
        })
      );

      await Promise.all(
        matchedPlayers.map((w) =>
          this.notificationService.sendToConnection(w.connectionId, {
            type: "error",
            message: "ゲームの作成に失敗しました。再度マッチングを行います。",
          })
        )
      );
    }
  }
}

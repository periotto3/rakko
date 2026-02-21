import { ConnectionRepository } from "../../domain/model/connection/connectionRepository.js";
import { GameRepository } from "../../domain/model/game/gameRepository.js";
import { Player } from "../../domain/model/player/player.js";
import { NotificationService } from "../service/notificationService.js";
import { ApplicationError } from "../error/applicationError.js";
import {
  drawCard,
  getDrawTarget,
  getNextActivePlayer,
  isGameOver,
  getRankings,
} from "../../domain/service/drawService.js";

export class DrawCardUseCase {
  constructor(
    private connectionRepo: ConnectionRepository,
    private gameRepo: GameRepository,
    private notificationService: NotificationService
  ) {}

  async execute(connectionId: string, cardIndex: number): Promise<void> {
    const conn = await this.connectionRepo.findById(connectionId);
    if (!conn?.gameId) {
      throw new ApplicationError("NOT_IN_GAME", "You are not in a game");
    }

    const game = await this.gameRepo.findById(conn.gameId);
    if (!game || game.phase !== "playing") {
      throw new ApplicationError("GAME_NOT_ACTIVE", "Game is not active");
    }

    const drawerIndex = game.players.findIndex(
      (p) => p.connectionId === connectionId
    );
    if (drawerIndex === -1) {
      throw new ApplicationError(
        "PLAYER_NOT_FOUND",
        "You are not in this game"
      );
    }

    if (drawerIndex !== game.currentTurnIndex) {
      throw new ApplicationError("NOT_YOUR_TURN", "Not your turn");
    }

    const targetIndex = getDrawTarget(game.players, drawerIndex);
    if (targetIndex === -1) {
      throw new ApplicationError(
        "NO_DRAW_TARGET",
        "No valid target to draw from"
      );
    }

    const targetHandSize = game.players[targetIndex].hand.length;
    if (cardIndex < 0 || cardIndex >= targetHandSize) {
      throw new ApplicationError(
        "INVALID_CARD_INDEX",
        `Invalid card index. Target has ${targetHandSize} cards (0-${targetHandSize - 1})`
      );
    }

    const result = drawCard(
      game.players,
      drawerIndex,
      targetIndex,
      cardIndex,
      game.finishedCount
    );

    let updatedGame = game.applyDrawResult(result.players, result.finishedCount);

    await this.notificationService.broadcastToGame(updatedGame, {
      type: "card_drawn",
      drawerSeat: drawerIndex,
      targetSeat: targetIndex,
      paired: result.paired,
    });

    if (isGameOver(updatedGame.players)) {
      let players = updatedGame.players;
      let finishedCount = updatedGame.finishedCount;

      const remaining = players
        .filter(p => p.finishedOrder === null)
        .sort((a, b) => a.hand.length - b.hand.length);
      for (const p of remaining) {
        finishedCount++;
        const idx = players.findIndex(pl => pl.seatIndex === p.seatIndex);
        players = players.map((pl, i) => i === idx ? pl.withFinishedOrder(finishedCount) : pl);
      }

      updatedGame = updatedGame.finish(players, finishedCount);
      await this.gameRepo.update(updatedGame);

      const rankings = getRankings(updatedGame.players);
      await this.notificationService.broadcastToGame(updatedGame, {
        type: "game_over",
        rankings,
      });

      await Promise.all([
        this.gameRepo.delete(updatedGame.gameId),
        ...updatedGame.players.map(p => this.connectionRepo.delete(p.connectionId)),
      ]);
      return;
    }

    updatedGame = updatedGame.advanceTurn(
      getNextActivePlayer(updatedGame.players, drawerIndex)
    );
    await this.gameRepo.update(updatedGame);

    await this.notificationService.sendPersonalizedState(updatedGame);
  }
}

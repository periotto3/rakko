import { ConnectionRepository } from "../../domain/model/connection/connectionRepository.js";
import { GameRepository } from "../../domain/model/game/gameRepository.js";
import { NotificationService } from "../service/notificationService.js";
import { PublicPlayer } from "../../domain/model/player/publicPlayer.js";
import { ApplicationError } from "../error/applicationError.js";

export class GetStateUseCase {
  constructor(
    private connectionRepo: ConnectionRepository,
    private gameRepo: GameRepository,
    private notificationService: NotificationService
  ) {}

  async execute(connectionId: string): Promise<void> {
    const conn = await this.connectionRepo.findById(connectionId);
    if (!conn?.gameId) {
      throw new ApplicationError("NOT_IN_GAME", "You are not in a game");
    }

    const game = await this.gameRepo.findById(conn.gameId);
    if (!game) {
      throw new ApplicationError("NOT_IN_GAME", "Game not found");
    }

    const player = game.players.find((p) => p.connectionId === connectionId);
    if (!player) {
      throw new ApplicationError(
        "PLAYER_NOT_FOUND",
        "You are not in this game"
      );
    }

    const publicPlayers = game.players.map(
      (p) =>
        new PublicPlayer(
          p.name,
          p.avatar,
          p.seatIndex,
          p.hand.length,
          p.finishedOrder
        )
    );

    await this.notificationService.sendToConnection(connectionId, {
      type: "game_state",
      phase: game.phase,
      yourHand: player.hand,
      players: publicPlayers,
      currentTurnSeat: game.currentTurnIndex,
    });
  }
}

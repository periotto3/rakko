import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { NotificationService } from "../../application/service/notificationService.js";
import { ConnectionRepository } from "../../domain/model/connection/connectionRepository.js";
import { Game } from "../../domain/model/game/game.js";
import { PublicPlayer } from "../../domain/model/player/publicPlayer.js";
import { ServerMessage } from "../../presentation/dto/serverMessage.js";

export class ApiGatewayNotificationService implements NotificationService {
  constructor(
    private endpoint: string,
    private connectionRepo: ConnectionRepository
  ) {}

  async sendToConnection(
    connectionId: string,
    message: ServerMessage
  ): Promise<void> {
    const client = new ApiGatewayManagementApiClient({
      endpoint: this.endpoint,
    });
    try {
      await client.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(message),
        })
      );
    } catch (err) {
      if (err instanceof GoneException || (err as any)?.statusCode === 410) {
        await this.connectionRepo.delete(connectionId);
      } else {
        throw err;
      }
    }
  }

  async broadcastToGame(game: Game, message: ServerMessage): Promise<void> {
    await Promise.all(
      game.players.map((p) => this.sendToConnection(p.connectionId, message))
    );
  }

  async sendPersonalizedState(game: Game): Promise<void> {
    await Promise.all(
      game.players.map((player) => {
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

        const msg: ServerMessage = {
          type: "game_state",
          phase: game.phase,
          yourHand: player.hand,
          players: publicPlayers,
          currentTurnSeat: game.currentTurnIndex,
        };

        return this.sendToConnection(player.connectionId, msg);
      })
    );
  }
}

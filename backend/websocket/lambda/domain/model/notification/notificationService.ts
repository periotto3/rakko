import { Game } from "../game/game.js";
import { ServerMessage } from "../../../presentation/dto/serverMessage.js";

export interface NotificationService {
  sendToConnection(connectionId: string, message: ServerMessage): Promise<void>;
  broadcastToGame(game: Game, message: ServerMessage): Promise<void>;
  sendPersonalizedState(game: Game): Promise<void>;
}

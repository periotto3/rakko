import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { GameState, PublicPlayer, ServerMessage } from "./types";
import { deleteConnection } from "./db";

export async function sendToConnection(
  endpoint: string,
  connectionId: string,
  data: ServerMessage
): Promise<void> {
  const client = new ApiGatewayManagementApiClient({ endpoint });
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(data),
      })
    );
  } catch (err) {
    if (err instanceof GoneException || (err as any)?.statusCode === 410) {
      await deleteConnection(connectionId);
    } else {
      throw err;
    }
  }
}

export async function broadcastToGame(
  endpoint: string,
  game: GameState,
  data: ServerMessage
): Promise<void> {
  await Promise.all(
    game.players.map((p) => sendToConnection(endpoint, p.connectionId, data))
  );
}

export async function sendPersonalizedState(
  endpoint: string,
  game: GameState
): Promise<void> {
  await Promise.all(
    game.players.map((player) => {
      const publicPlayers: PublicPlayer[] = game.players.map((p) => ({
        name: p.name,
        avatar: p.avatar,
        seatIndex: p.seatIndex,
        cardCount: p.hand.length,
        finishedOrder: p.finishedOrder,
      }));

      const msg: ServerMessage = {
        type: "game_state",
        phase: game.phase,
        yourHand: player.hand,
        players: publicPlayers,
        currentTurnSeat: game.currentTurnIndex,
      };

      return sendToConnection(endpoint, player.connectionId, msg);
    })
  );
}

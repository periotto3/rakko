import { getConnection, getGame } from "../db";
import { sendToConnection } from "../broadcast";
import { PublicPlayer, ServerMessage } from "../types";

export async function handleGetState(
  endpoint: string,
  connectionId: string
): Promise<void> {
  const conn = await getConnection(connectionId);
  if (!conn?.gameId) {
    await sendToConnection(endpoint, connectionId, {
      type: "error",
      message: "You are not in a game",
    });
    return;
  }

  const game = await getGame(conn.gameId);
  if (!game) {
    await sendToConnection(endpoint, connectionId, {
      type: "error",
      message: "Game not found",
    });
    return;
  }

  const player = game.players.find((p) => p.connectionId === connectionId);
  if (!player) {
    await sendToConnection(endpoint, connectionId, {
      type: "error",
      message: "You are not in this game",
    });
    return;
  }

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

  await sendToConnection(endpoint, connectionId, msg);
}

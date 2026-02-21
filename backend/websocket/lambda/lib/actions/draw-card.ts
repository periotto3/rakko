import { getConnection, getGame, updateGame } from "../db";
import { broadcastToGame, sendPersonalizedState, sendToConnection } from "../broadcast";
import {
  drawCard,
  getDrawTarget,
  getNextActivePlayer,
  isGameOver,
  getRankings,
} from "../game-logic";
import { ServerMessage } from "../types";

export async function handleDrawCard(
  endpoint: string,
  connectionId: string,
  cardIndex: number
): Promise<void> {
  // Get connection info
  const conn = await getConnection(connectionId);
  if (!conn?.gameId) {
    await sendToConnection(endpoint, connectionId, {
      type: "error",
      message: "You are not in a game",
    });
    return;
  }

  // Get game state
  const game = await getGame(conn.gameId);
  if (!game || game.phase !== "playing") {
    await sendToConnection(endpoint, connectionId, {
      type: "error",
      message: "Game is not active",
    });
    return;
  }

  // Verify it's this player's turn
  const drawerIndex = game.players.findIndex(
    (p) => p.connectionId === connectionId
  );
  if (drawerIndex === -1) {
    await sendToConnection(endpoint, connectionId, {
      type: "error",
      message: "You are not in this game",
    });
    return;
  }

  if (drawerIndex !== game.currentTurnIndex) {
    await sendToConnection(endpoint, connectionId, {
      type: "error",
      message: "Not your turn",
    });
    return;
  }

  // Determine the target player to draw from
  const targetIndex = getDrawTarget(game.players, drawerIndex);
  if (targetIndex === -1) {
    await sendToConnection(endpoint, connectionId, {
      type: "error",
      message: "No valid target to draw from",
    });
    return;
  }

  // Validate card index
  const targetHandSize = game.players[targetIndex].hand.length;
  if (cardIndex < 0 || cardIndex >= targetHandSize) {
    await sendToConnection(endpoint, connectionId, {
      type: "error",
      message: `Invalid card index. Target has ${targetHandSize} cards (0-${targetHandSize - 1})`,
    });
    return;
  }

  // Execute the draw
  const result = drawCard(
    game.players,
    drawerIndex,
    targetIndex,
    cardIndex,
    game.finishedCount
  );

  game.players = result.players;
  game.finishedCount = result.finishedCount;

  // Broadcast the card_drawn event
  const cardDrawnMsg: ServerMessage = {
    type: "card_drawn",
    drawerSeat: drawerIndex,
    targetSeat: targetIndex,
    paired: result.paired,
  };
  await broadcastToGame(endpoint, game, cardDrawnMsg);

  // Check if game is over
  if (isGameOver(game.players)) {
    game.phase = "finished";

    // Assign last place to remaining player
    const loser = game.players.find(
      (p) => p.hand.length > 0 && p.finishedOrder === null
    );
    if (loser) {
      game.finishedCount++;
      loser.finishedOrder = game.finishedCount;
    }

    game.version++;
    await updateGame(game);

    const rankings = getRankings(game.players);
    await broadcastToGame(endpoint, game, {
      type: "game_over",
      rankings,
    });
    return;
  }

  // Advance to next active player's turn
  game.currentTurnIndex = getNextActivePlayer(game.players, drawerIndex);
  game.version++;
  await updateGame(game);

  // Send personalized state to all players
  await sendPersonalizedState(endpoint, game);
}

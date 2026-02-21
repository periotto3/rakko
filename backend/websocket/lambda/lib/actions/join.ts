import { randomUUID } from "crypto";
import {
  addToMatchmaking,
  getWaitingPlayers,
  removeFromMatchmaking,
  createGame,
  setConnectionGameId,
  saveConnection,
  getRouletteState,
  saveRouletteState,
  deleteRouletteState,
} from "../db";
import { sendToConnection } from "../broadcast";
import { dealCards } from "../game-logic";
import { GameState, Player, PublicPlayer, ServerMessage } from "../types";
import { THEME_SLOT_KEYS, THEME_ITEMS, pickRandomItem } from "../theme-data";

const AVATARS = ["😊", "🐱", "🐶", "🐰"];

export async function handleJoin(
  endpoint: string,
  connectionId: string,
  playerName: string
): Promise<void> {
  // Save connection with player name
  await saveConnection(connectionId, playerName);

  // Add to matchmaking queue
  await addToMatchmaking(connectionId, playerName);

  // Check how many players are waiting
  const waiting = await getWaitingPlayers();

  // Determine roulette slot
  let slots = await getRouletteState();
  let newSlot = null;
  if (slots.length < waiting.length && slots.length < 4) {
    const key = THEME_SLOT_KEYS[slots.length];
    newSlot = { key, value: pickRandomItem(key), slotIndex: slots.length };
    slots = [...slots, newSlot];
    await saveRouletteState(slots);
  }

  if (waiting.length < 4) {
    // Notify all waiting players of the current count with roulette info
    await Promise.all(
      waiting.map((w) =>
        sendToConnection(endpoint, w.connectionId, {
          type: "waiting",
          waitingCount: waiting.length,
          decidedSlots: slots,
          newSlot,
          slotCandidates: THEME_ITEMS,
        })
      )
    );
    return;
  }

  // 4 players reached — send final roulette waiting message, then start the game
  const matchedPlayers = waiting.slice(0, 4);

  // Send waiting message with the last roulette slot
  await Promise.all(
    matchedPlayers.map((w) =>
      sendToConnection(endpoint, w.connectionId, {
        type: "waiting",
        waitingCount: 4,
        decidedSlots: slots,
        newSlot,
        slotCandidates: THEME_ITEMS,
      })
    )
  );

  // Create players with seats
  let players: Player[] = matchedPlayers.map((w, i) => ({
    connectionId: w.connectionId,
    name: w.playerName,
    avatar: AVATARS[i],
    seatIndex: i,
    hand: [],
    finishedOrder: null,
  }));

  // Deal cards and remove pairs
  players = dealCards(players);

  const gameId = randomUUID();
  const game: GameState = {
    gameId,
    phase: "playing",
    players,
    currentTurnIndex: 0,
    finishedCount: 0,
    version: 1,
  };

  // Save game and update connections
  await createGame(game);

  await Promise.all([
    // Remove all matched players from matchmaking
    ...matchedPlayers.map((w) => removeFromMatchmaking(w.connectionId)),
    // Associate each connection with the game
    ...matchedPlayers.map((w) => setConnectionGameId(w.connectionId, gameId)),
    // Clean up roulette state
    deleteRouletteState(),
  ]);

  // Send personalized game_start to each player
  const publicPlayers: PublicPlayer[] = players.map((p) => ({
    name: p.name,
    avatar: p.avatar,
    seatIndex: p.seatIndex,
    cardCount: p.hand.length,
    finishedOrder: p.finishedOrder,
  }));

  await Promise.all(
    players.map((player) => {
      const msg: ServerMessage = {
        type: "game_start",
        gameId,
        yourSeatIndex: player.seatIndex,
        yourHand: player.hand,
        players: publicPlayers,
        currentTurnSeat: game.currentTurnIndex,
      };
      return sendToConnection(endpoint, player.connectionId, msg);
    })
  );
}

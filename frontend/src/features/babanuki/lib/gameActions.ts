import { BabanukiPlayer, ThemeSlot } from "./types";
import { GameState } from "./gameState";

export type GameAction =
  | { type: "START_GAME" }
  | { type: "PLAYER_JOIN"; payload: BabanukiPlayer }
  | { type: "SET_THEME"; payload: ThemeSlot }
  | { type: "GENERATION_COMPLETE"; payload: { imageUrl: string } }
  | {
      type: "UPDATE_GAME";
      payload: {
        players: BabanukiPlayer[];
        currentTurnIndex: number;
        targetIndex: number;
      };
    }
  | {
      type: "GAME_OVER";
      payload: { winner: BabanukiPlayer; finalPlayers: BabanukiPlayer[] };
    }
  | { type: "REMATCH" }
  | { type: "SYNC_FROM_SERVER"; payload: Partial<GameState> };

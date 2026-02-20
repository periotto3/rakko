import { BabanukiPlayer, GamePhase, ThemeSlot } from "./types";

export interface GameState {
  phase: GamePhase;
  players: BabanukiPlayer[];
  theme: ThemeSlot | null;
  currentTurnIndex: number;
  targetIndex: number;
  winner: BabanukiPlayer | null;
  finalPlayers: BabanukiPlayer[];
  backgroundImage: string;
}

export const initialGameState: GameState = {
  phase: "title",
  players: [],
  theme: null,
  currentTurnIndex: 0,
  targetIndex: -1,
  winner: null,
  finalPlayers: [],
  backgroundImage: "",
};

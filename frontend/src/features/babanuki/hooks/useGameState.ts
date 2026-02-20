import { useReducer } from "react";
import { gameReducer } from "../reducers/gameReducer";
import { initialGameState } from "../lib/gameState";

export function useGameState() {
  return useReducer(gameReducer, initialGameState);
}

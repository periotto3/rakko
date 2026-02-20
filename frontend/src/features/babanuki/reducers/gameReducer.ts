import { GameState, initialGameState } from "../lib/gameState";
import { GameAction } from "../lib/gameActions";
import { dealCards, getDrawTarget } from "../lib/engine";

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME":
      return { ...initialGameState, phase: "waiting" };

    case "PLAYER_JOIN": {
      if (state.players.find((p) => p.id === action.payload.id)) return state;
      return { ...state, players: [...state.players, action.payload] };
    }

    case "SET_THEME":
      return { ...state, theme: action.payload, phase: "generating" };

    case "GENERATION_COMPLETE": {
      const dealtPlayers = dealCards(state.players);
      return {
        ...state,
        backgroundImage: action.payload.imageUrl,
        players: dealtPlayers,
        currentTurnIndex: 0,
        targetIndex: getDrawTarget(dealtPlayers, 0),
        phase: "playing",
      };
    }

    case "UPDATE_GAME":
      return {
        ...state,
        players: action.payload.players,
        currentTurnIndex: action.payload.currentTurnIndex,
        targetIndex: action.payload.targetIndex,
      };

    case "GAME_OVER":
      return {
        ...state,
        winner: action.payload.winner,
        finalPlayers: action.payload.finalPlayers,
        phase: "result",
      };

    case "REMATCH":
      return initialGameState;

    case "SYNC_FROM_SERVER":
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

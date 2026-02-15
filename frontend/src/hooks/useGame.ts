"use client";

import { useCallback, useEffect, useReducer } from "react";
import { GameState, ArchitectureEvaluation } from "@/lib/types";
import {
  createInitialState,
  setupLobby,
  toggleReady,
  allReady,
  startGame,
  applyDiscard,
  applyCPUDiscards,
  submitArchitecture,
  applyCPUSubmissions,
  applyEvaluations,
  startNextRound,
} from "@/lib/gameEngine";
import { MockArchitectureEvaluator } from "@/lib/mockEvaluator";

const evaluator = new MockArchitectureEvaluator();

type GameAction =
  | { type: "JOIN_LOBBY" }
  | { type: "TOGGLE_READY"; playerId: string }
  | { type: "START_GAME" }
  | { type: "DISCARD"; playerId: string; discardIndices: number[] }
  | { type: "CPU_DISCARD" }
  | { type: "SELECT_ARCHITECTURE"; playerId: string; resourceIds: string[] }
  | { type: "CPU_SELECT_ARCHITECTURE" }
  | { type: "SET_EVALUATIONS"; results: Record<string, ArchitectureEvaluation> }
  | { type: "NEXT_ROUND" }
  | { type: "RESET" };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "JOIN_LOBBY":
      return setupLobby(state);

    case "TOGGLE_READY":
      return toggleReady(state, action.playerId);

    case "START_GAME":
      if (!allReady(state)) return state;
      return startGame(state);

    case "DISCARD":
      if (state.phase !== "drafting") return state;
      return applyDiscard(state, action.playerId, action.discardIndices);

    case "CPU_DISCARD":
      if (state.phase !== "drafting") return state;
      return applyCPUDiscards(state);

    case "SELECT_ARCHITECTURE":
      if (state.phase !== "building") return state;
      return submitArchitecture(state, action.playerId, action.resourceIds);

    case "CPU_SELECT_ARCHITECTURE":
      if (state.phase !== "building") return state;
      return applyCPUSubmissions(state);

    case "SET_EVALUATIONS":
      return applyEvaluations(state, action.results);

    case "NEXT_ROUND":
      if (state.phase !== "roundResult") return state;
      return startNextRound(state);

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  const joinLobby = useCallback(() => {
    dispatch({ type: "JOIN_LOBBY" });
  }, []);

  const togglePlayerReady = useCallback((playerId: string) => {
    dispatch({ type: "TOGGLE_READY", playerId });
  }, []);

  const handleStartGame = useCallback(() => {
    dispatch({ type: "START_GAME" });
  }, []);

  const handleDiscard = useCallback((playerId: string, discardIndices: number[]) => {
    dispatch({ type: "DISCARD", playerId, discardIndices });
  }, []);

  const handleSubmitArchitecture = useCallback((playerId: string, resourceIds: string[]) => {
    dispatch({ type: "SELECT_ARCHITECTURE", playerId, resourceIds });
  }, []);

  const handleNextRound = useCallback(() => {
    dispatch({ type: "NEXT_ROUND" });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // CPU auto-ready in lobby
  useEffect(() => {
    if (state.phase !== "lobby") return;

    const humanReady = state.players.find((p) => !p.isCPU)?.isReady;
    if (!humanReady) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    state.players.forEach((p, i) => {
      if (p.isCPU && !p.isReady) {
        const timer = setTimeout(() => {
          dispatch({ type: "TOGGLE_READY", playerId: p.id });
        }, 500 + i * 800);
        timers.push(timer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [state.phase, state.players]);

  // CPU auto-discard in drafting
  useEffect(() => {
    if (state.phase !== "drafting") return;

    const humanPlayer = state.players.find((p) => !p.isCPU);
    if (!humanPlayer?.hasDiscarded) return;

    const timer = setTimeout(() => {
      dispatch({ type: "CPU_DISCARD" });
    }, 600);

    return () => clearTimeout(timer);
  }, [state.phase, state.players]);

  // CPU auto-submit in building
  useEffect(() => {
    if (state.phase !== "building") return;

    const humanPlayer = state.players.find((p) => !p.isCPU);
    if (!humanPlayer?.hasSubmitted) return;

    const timer = setTimeout(() => {
      dispatch({ type: "CPU_SELECT_ARCHITECTURE" });
    }, 600);

    return () => clearTimeout(timer);
  }, [state.phase, state.players]);

  // Auto-evaluate when entering evaluating phase
  useEffect(() => {
    if (state.phase !== "evaluating") return;

    let cancelled = false;

    async function runEvaluation() {
      const results: Record<string, ArchitectureEvaluation> = {};

      await Promise.all(
        state.players.map(async (p) => {
          const resources = p.selectedResources.length > 0 ? p.selectedResources : p.hand;
          results[p.id] = await evaluator.evaluate(resources);
        })
      );

      if (!cancelled) {
        dispatch({ type: "SET_EVALUATIONS", results });
      }
    }

    runEvaluation();
    return () => { cancelled = true; };
  }, [state.phase, state.players]);

  return {
    state,
    joinLobby,
    togglePlayerReady,
    handleStartGame,
    handleDiscard,
    handleSubmitArchitecture,
    handleNextRound,
    handleReset,
  };
}

"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  ThemeSlot,
  TitleScreen,
  WaitingScreen,
  GeneratingScreen,
  PlayScreen,
  ResultScreen,
} from "@/features/babanuki";
import { useGameState } from "@/features/babanuki/hooks/useGameState";

const MAX_PLAYERS = 4;

export default function BabanukiPage() {
  const [state, dispatch] = useGameState();
  const cpuJoinTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      cpuJoinTimers.current.forEach(clearTimeout);
    };
  }, []);

  const handleStart = useCallback(() => {
    cpuJoinTimers.current.forEach(clearTimeout);
    cpuJoinTimers.current = [];
    dispatch({ type: "START_GAME" });

    const allJoiners = [
      { id: "human", name: "あなた", avatar: "😊", isCPU: false },
      { id: "cpu1", name: "Aさん", avatar: "🐱", isCPU: true },
      { id: "cpu2", name: "Bさん", avatar: "🐶", isCPU: true },
      { id: "cpu3", name: "Cさん", avatar: "🐰", isCPU: true },
    ];

    allJoiners.forEach((p, i) => {
      const timer = setTimeout(() => {
        dispatch({
          type: "PLAYER_JOIN",
          payload: { ...p, hand: [], finishedOrder: null },
        });
      }, 500 + i * 2500);
      cpuJoinTimers.current.push(timer);
    });
  }, [dispatch]);

  const handleThemeDecided = useCallback(
    (theme: ThemeSlot) => {
      dispatch({ type: "SET_THEME", payload: theme });
    },
    [dispatch]
  );

  const handleGenerationComplete = useCallback(
    (imageUrl: string) => {
      dispatch({ type: "GENERATION_COMPLETE", payload: { imageUrl } });
    },
    [dispatch]
  );

  const handleRematch = useCallback(() => {
    cpuJoinTimers.current.forEach(clearTimeout);
    cpuJoinTimers.current = [];
    dispatch({ type: "REMATCH" });
  }, [dispatch]);

  switch (state.phase) {
    case "title":
      return <TitleScreen onStart={handleStart} />;

    case "waiting":
      return (
        <WaitingScreen
          players={state.players}
          maxPlayers={MAX_PLAYERS}
          onThemeDecided={handleThemeDecided}
        />
      );

    case "generating":
      return (
        <GeneratingScreen
          theme={state.theme!}
          onComplete={handleGenerationComplete}
        />
      );

    case "playing":
      return (
        <PlayScreen
          players={state.players}
          currentTurnIndex={state.currentTurnIndex}
          targetIndex={state.targetIndex}
          theme={state.theme!}
          backgroundImage={state.backgroundImage || undefined}
          dispatch={dispatch}
        />
      );

    case "result":
      return (
        <ResultScreen
          winner={state.winner!}
          players={state.finalPlayers}
          onRematch={handleRematch}
        />
      );
  }
}

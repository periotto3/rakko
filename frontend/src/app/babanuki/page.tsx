"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  BabanukiPlayer,
  ThemeSlot,
  GamePhase,
  TitleScreen,
  WaitingScreen,
  GeneratingScreen,
  PlayScreen,
  ResultScreen,
  dealCards,
} from "@/features/babanuki";

const MAX_PLAYERS = 4;

export default function BabanukiPage() {
  const [phase, setPhase] = useState<GamePhase>("title");
  const [players, setPlayers] = useState<BabanukiPlayer[]>([]);
  const [theme, setTheme] = useState<ThemeSlot | null>(null);
  const [winner, setWinner] = useState<BabanukiPlayer | null>(null);
  const [finalPlayers, setFinalPlayers] = useState<BabanukiPlayer[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const cpuJoinTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      cpuJoinTimers.current.forEach(clearTimeout);
    };
  }, []);

  const handleStart = useCallback(() => {
    setPlayers([]);
    setPhase("waiting");

    const allJoiners = [
      { id: "human", name: "あなた", avatar: "😊", isCPU: false },
      { id: "cpu1", name: "Aさん", avatar: "🐱", isCPU: true },
      { id: "cpu2", name: "Bさん", avatar: "🐶", isCPU: true },
      { id: "cpu3", name: "Cさん", avatar: "🐰", isCPU: true },
    ];

    allJoiners.forEach((p, i) => {
      const timer = setTimeout(() => {
        setPlayers((prev) => {
          if (prev.find((existing) => existing.id === p.id)) return prev;
          return [
            ...prev,
            { ...p, hand: [], finishedOrder: null },
          ];
        });
      }, 500 + i * 2500);
      cpuJoinTimers.current.push(timer);
    });
  }, []);

  const handleThemeDecided = useCallback((decidedTheme: ThemeSlot) => {
    setTheme(decidedTheme);
    setPhase("generating");
  }, []);

  const handleGenerationComplete = useCallback((imageUrl: string) => {
    setBackgroundImage(imageUrl);
    setPlayers((prev) => dealCards(prev));
    setPhase("playing");
  }, []);

  const handleGameEnd = useCallback(
    (gameWinner: BabanukiPlayer, endPlayers: BabanukiPlayer[]) => {
      setWinner(gameWinner);
      setFinalPlayers(endPlayers);
      setPhase("result");
    },
    []
  );

  const handleRematch = useCallback(() => {
    cpuJoinTimers.current.forEach(clearTimeout);
    cpuJoinTimers.current = [];
    setPlayers([]);
    setTheme(null);
    setWinner(null);
    setFinalPlayers([]);
    setBackgroundImage("");
    setPhase("title");
  }, []);

  switch (phase) {
    case "title":
      return <TitleScreen onStart={handleStart} />;

    case "waiting":
      return (
        <WaitingScreen
          players={players}
          maxPlayers={MAX_PLAYERS}
          onThemeDecided={handleThemeDecided}
        />
      );

    case "generating":
      return (
        <GeneratingScreen
          theme={theme!}
          onComplete={handleGenerationComplete}
        />
      );

    case "playing":
      return (
        <PlayScreen
          initialPlayers={players}
          theme={theme!}
          onGameEnd={handleGameEnd}
          backgroundImage={backgroundImage || undefined}
        />
      );

    case "result":
      return (
        <ResultScreen
          winner={winner!}
          players={finalPlayers}
          onRematch={handleRematch}
        />
      );
  }
}

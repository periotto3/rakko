"use client";

import { useState, useCallback } from "react";
import {
  BabanukiPlayer,
  ThemeSlot,
  GamePhase,
  TitleScreen,
  WaitingScreen,
  GeneratingScreen,
  ResultScreen,
} from "@/features/babanuki";
import { GamePlayScreen } from "@/features/babanuki";
import type { GameMode } from "@/features/babanuki";
import { CpuGameService } from "@/features/babanuki/services/cpuGameService";
import { OnlineGameService } from "@/features/babanuki/services/onlineGameService";
import type { GameService, GameStartData, RankingData } from "@/features/babanuki/services/gameService";

const MAX_PLAYERS = 4;

const CPU_PLAYERS_DISPLAY = [
  { id: "human", name: "あなた", avatar: "/avatars/user.png", isCPU: false },
  { id: "cpu1", name: "Aさん", avatar: "/avatars/cpu_1.png", isCPU: true },
  { id: "cpu2", name: "Bさん", avatar: "/avatars/cpu_2.png", isCPU: true },
  { id: "cpu3", name: "Cさん", avatar: "/avatars/cpu_3.png", isCPU: true },
];

export default function BabanukiPage() {
  const [phase, setPhase] = useState<GamePhase>("title");
  const [players, setPlayers] = useState<BabanukiPlayer[]>([]);
  const [theme, setTheme] = useState<ThemeSlot | null>(null);
  const [winner, setWinner] = useState<BabanukiPlayer | null>(null);
  const [finalPlayers, setFinalPlayers] = useState<BabanukiPlayer[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [gameService, setGameService] = useState<GameService | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("cpu");
  const [gameStartData, setGameStartData] = useState<GameStartData | null>(null);
  const [rankings, setRankings] = useState<RankingData[] | null>(null);

  const handleStart = useCallback((mode: GameMode, playerName?: string) => {
    gameService?.dispose();

    const service: GameService = mode === "online" ? new OnlineGameService() : new CpuGameService();
    setGameService(service);
    setGameMode(mode);
    setPlayers([]);
    setPhase("waiting");

    // onGameStart は両モード共通: gameStartData を保存してゲーム画面へ
    service.onGameStart((data) => {
      setGameStartData(data);
      setPhase("playing");
    });

    if (mode === "cpu") {
      // CPU: onWaiting でプレイヤーを1人ずつ追加（WaitingScreen + テーマルーレット用）
      const allDisplayPlayers = [
        { ...CPU_PLAYERS_DISPLAY[0], name: playerName ?? "あなた" },
        ...CPU_PLAYERS_DISPLAY.slice(1),
      ];
      service.onWaiting((count) => {
        setPlayers(
          allDisplayPlayers.slice(0, count).map((p) => ({ ...p, hand: [], finishedOrder: null }))
        );
      });
    }

    service.join(playerName ?? "プレイヤー");
  }, [gameService]);

  const handleThemeDecided = useCallback((decidedTheme: ThemeSlot) => {
    setTheme(decidedTheme);
    setPhase("generating");
  }, []);

  const handleGenerationComplete = useCallback((imageUrl: string) => {
    setBackgroundImage(imageUrl);
    // CPU モード: startGame() でカード配布 + onGameStart 発火 → phase="playing"
    gameService?.startGame();
  }, [gameService]);

  const handleGameEnd = useCallback(
    (gameWinner: BabanukiPlayer, endPlayers: BabanukiPlayer[], gameRankings?: RankingData[]) => {
      setWinner(gameWinner);
      setFinalPlayers(endPlayers);
      if (gameRankings) setRankings(gameRankings);
      setPhase("result");
    },
    []
  );

  const handleRematch = useCallback(() => {
    gameService?.dispose();
    setGameService(null);
    setPlayers([]);
    setTheme(null);
    setWinner(null);
    setFinalPlayers([]);
    setBackgroundImage("");
    setGameStartData(null);
    setRankings(null);
    setPhase("title");
  }, [gameService]);

  switch (phase) {
    case "title":
      return <TitleScreen onStart={handleStart} />;

    case "waiting":
      return (
        <WaitingScreen
          mode={gameMode}
          gameService={gameService!}
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
        <GamePlayScreen
          gameService={gameService!}
          gameStartData={gameStartData!}
          backgroundImage={backgroundImage || undefined}
          onGameEnd={handleGameEnd}
        />
      );

    case "result":
      return (
        <ResultScreen
          winner={winner!}
          players={finalPlayers}
          rankings={rankings ?? undefined}
          onRematch={handleRematch}
        />
      );
  }
}


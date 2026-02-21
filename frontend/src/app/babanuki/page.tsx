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
  OnlinePlayScreen,
  ResultScreen,
  dealCards,
} from "@/features/babanuki";
import type { GameMode } from "@/features/babanuki";
import { CpuGameService } from "@/features/babanuki/services/cpuGameService";
import { OnlineGameService } from "@/features/babanuki/services/onlineGameService";
import type { GameService, GameStartData, RankingData } from "@/features/babanuki/services/gameService";

const MAX_PLAYERS = 4;

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
  const cpuJoinTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      cpuJoinTimers.current.forEach(clearTimeout);
    };
  }, []);

  const handleStart = useCallback((mode: GameMode, playerName?: string) => {
    // 既存の gameService があれば破棄
    gameService?.dispose();

    const service = mode === "online" ? new OnlineGameService() : new CpuGameService();
    setGameService(service);
    setGameMode(mode);

    setPlayers([]);
    setPhase("waiting");

    if (mode === "cpu") {
      // CPU モード：既存の waiting 演出をそのまま使う
      const allJoiners = [
        { id: "human", name: playerName ?? "あなた", avatar: "/avatars/user.png", isCPU: false },
        { id: "cpu1", name: "Aさん", avatar: "/avatars/cpu_1.png", isCPU: true },
        { id: "cpu2", name: "Bさん", avatar: "/avatars/cpu_2.png", isCPU: true },
        { id: "cpu3", name: "Cさん", avatar: "/avatars/cpu_3.png", isCPU: true },
      ];
      allJoiners.forEach((p, i) => {
        const timer = setTimeout(() => {
          setPlayers((prev) => {
            if (prev.find((existing) => existing.id === p.id)) return prev;
            return [...prev, { ...p, hand: [], finishedOrder: null }];
          });
        }, 500 + i * 2500);
        cpuJoinTimers.current.push(timer);
      });
    } else {
      // オンラインモード：GameService 経由でマッチング（Phase 3 で WaitingScreen と接続予定）
      service.join(playerName ?? "プレイヤー");
    }
  }, [gameService]);

  const handleThemeDecided = useCallback((decidedTheme: ThemeSlot) => {
    setTheme(decidedTheme);
    setPhase("generating");
  }, []);

  // オンラインモード：game_start 受信時（WaitingScreen から呼ばれる）
  const handleOnlineGameStart = useCallback((data: GameStartData) => {
    setGameStartData(data);
    // オンラインはテーマルーレット・画像生成をスキップして直接 playing へ
    setTheme({ work: "", when: "", where: "", style: "" });
    setPhase("playing");
  }, []);

  const handleGenerationComplete = useCallback((imageUrl: string) => {
    setBackgroundImage(imageUrl);
    setPlayers((prev) => dealCards(prev));
    setPhase("playing");
  }, []);

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
    cpuJoinTimers.current.forEach(clearTimeout);
    cpuJoinTimers.current = [];
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
          onGameStart={handleOnlineGameStart}
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
      if (gameMode === "online" && gameStartData) {
        return (
          <OnlinePlayScreen
            gameService={gameService!}
            gameStartData={gameStartData}
            onGameEnd={handleGameEnd}
          />
        );
      }
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
          rankings={rankings ?? undefined}
          onRematch={handleRematch}
        />
      );
  }
}

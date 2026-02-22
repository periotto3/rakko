"use client";

import { useState, useCallback } from "react";
import {
  BabanukiPlayer,
  ThemeSlot,
  GamePhase,
  GameMode,
  GameService,
  GameStartData,
  RankingData,
  createGameService,
  TitleScreen,
  WaitingScreen,
  GeneratingScreen,
  GamePlayScreen,
  ResultScreen,
} from "@/features/babanuki";

const MAX_PLAYERS = 4;

export default function BabanukiPage() {
  const [phase, setPhase] = useState<GamePhase>("title");
  const [players, setPlayers] = useState<BabanukiPlayer[]>([]);
  const [theme, setTheme] = useState<ThemeSlot | null>(null);
  const [winner, setWinner] = useState<BabanukiPlayer | null>(null);
  const [finalPlayers, setFinalPlayers] = useState<BabanukiPlayer[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  const [gameService, setGameService] = useState<GameService | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("cpu");
  const [gameStartData, setGameStartData] = useState<GameStartData | null>(null);
  const [rankings, setRankings] = useState<RankingData[] | null>(null);

  const handleStart = useCallback((mode: GameMode, playerName?: string) => {
    gameService?.dispose();

    const service = createGameService(mode);
    setGameService(service);
    setGameMode(mode);
    setPlayers([]);
    setPhase("waiting");

    service.onGameStart((data) => {
      setGameStartData(data);
      setPhase("playing");
    });

    service.onWaitingPlayers((ps) => {
      setPlayers(ps);
    });

    service.onGenerating(() => {
      setImageGenError(null);
      setTimeout(() => setIsGenerating(true), 3000);
    });

    service.onImagesReady((urls) => {
      setIsGenerating(false);
      if (urls.length > 0) {
        setBackgroundImage(urls[0]);
      } else {
        setImageGenError("画像の生成に失敗しました");
      }
    });

    service.join(playerName ?? "プレイヤー");
  }, [gameService]);

  const handleThemeDecided = useCallback((decidedTheme: ThemeSlot) => {
    setTheme(decidedTheme);
    setPhase("generating");
  }, []);

  const handleGenerationComplete = useCallback((imageUrl: string) => {
    setBackgroundImage(imageUrl);
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
    setIsGenerating(false);
    setImageGenError(null);
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
          isGenerating={isGenerating}
          imageGenError={imageGenError}
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


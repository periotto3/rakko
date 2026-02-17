"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/contexts/GameContext";
import GameTable from "@/components/GameTable";
import RoundResultScreen from "@/components/RoundResultScreen";
import ResultScreen from "@/components/ResultScreen";

export default function GamePage() {
  const router = useRouter();
  const {
    state,
    handleDiscard,
    handleSubmitArchitecture,
    handleNextRound,
    handleReset,
  } = useGameContext();

  // ゲーム未開始なら /waiting にリダイレクト
  useEffect(() => {
    if (state.phase === "idle" || state.phase === "lobby") {
      router.push("/waiting");
    }
  }, [state.phase, router]);

  switch (state.phase) {
    case "drafting":
    case "building":
      return (
        <GameTable
          state={state}
          onDiscard={handleDiscard}
          onSubmitArchitecture={handleSubmitArchitecture}
        />
      );

    case "evaluating":
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
          <div className="text-4xl animate-spin">⚙️</div>
          <p className="text-white text-lg font-medium">
            アーキテクチャを評価中...
          </p>
          <p className="text-slate-400 text-sm">LLMが構成を分析しています</p>
        </div>
      );

    case "roundResult":
      return (
        <RoundResultScreen
          players={state.players}
          round={state.round}
          maxRounds={state.maxRounds}
          onNextRound={handleNextRound}
        />
      );

    case "result":
      return (
        <ResultScreen players={state.players} onPlayAgain={handleReset} />
      );

    default:
      return null;
  }
}

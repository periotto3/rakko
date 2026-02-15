"use client";

import { useGame } from "@/hooks/useGame";
import { allReady } from "@/lib/gameEngine";
import Lobby from "@/components/Lobby";
import GameTable from "@/components/GameTable";
import RoundResultScreen from "@/components/RoundResultScreen";
import ResultScreen from "@/components/ResultScreen";

export default function GamePage() {
  const {
    state,
    joinLobby,
    togglePlayerReady,
    handleStartGame,
    handleDiscard,
    handleSubmitArchitecture,
    handleNextRound,
    handleReset,
  } = useGame();

  switch (state.phase) {
    case "idle":
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
          <h1 className="text-4xl font-bold text-white">Rakko</h1>
          <p className="text-slate-400">AWS構成バトル</p>
          <button
            onClick={joinLobby}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xl transition-colors"
          >
            ロビーに参加
          </button>
        </div>
      );

    case "lobby":
      return (
        <Lobby
          players={state.players}
          onReady={() => togglePlayerReady("player")}
          onStart={handleStartGame}
          allReady={allReady(state)}
        />
      );

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

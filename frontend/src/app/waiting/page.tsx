"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/contexts/GameContext";
import { allReady } from "@/lib/gameEngine";
import Lobby from "@/components/Lobby";

export default function WaitingPage() {
  const router = useRouter();
  const { state, joinLobby, togglePlayerReady, handleStartGame } =
    useGameContext();

  // idle状態なら自動でロビーに参加
  useEffect(() => {
    if (state.phase === "idle") {
      joinLobby();
    }
  }, [state.phase, joinLobby]);

  // ゲーム開始したら /game に遷移
  useEffect(() => {
    if (
      state.phase === "drafting" ||
      state.phase === "building" ||
      state.phase === "evaluating" ||
      state.phase === "roundResult" ||
      state.phase === "result"
    ) {
      router.push("/game");
    }
  }, [state.phase, router]);

  if (state.phase === "idle") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6">
        <div className="text-4xl animate-spin">⚙️</div>
        <p className="text-white text-lg">ロビーを準備中...</p>
      </div>
    );
  }

  if (state.phase === "lobby") {
    return (
      <Lobby
        players={state.players}
        onReady={() => togglePlayerReady("player")}
        onStart={handleStartGame}
        allReady={allReady(state)}
      />
    );
  }

  return null;
}

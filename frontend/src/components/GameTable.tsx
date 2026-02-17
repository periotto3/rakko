"use client";

import { useState } from "react";
import { GameState, Player } from "@/lib/types";
import ResourceCard from "./ResourceCard";

type Props = {
  state: GameState;
  onDiscard: (playerId: string, discardIndices: number[]) => void;
  onSubmitArchitecture: (playerId: string, resourceIds: string[]) => void;
};

type TablePosition = "bottom" | "right" | "top" | "left";

function getPlayerPositions(
  players: Player[]
): { player: Player; position: TablePosition }[] {
  const human = players.find((p) => !p.isCPU)!;
  const cpus = players.filter((p) => p.isCPU);
  return [
    { player: human, position: "bottom" },
    { player: cpus[0], position: "right" },
    { player: cpus[1], position: "top" },
    { player: cpus[2], position: "left" },
  ];
}

/* 裏面の牌 - 琥珀/金色 (じゃんたま風) */
function FaceDownCards({
  count,
  vertical,
}: {
  count: number;
  vertical?: boolean;
}) {
  return (
    <div className={`flex ${vertical ? "flex-col" : ""} gap-[2px]`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${
            vertical ? "w-[26px] h-[18px]" : "w-[18px] h-[26px]"
          } rounded-[2px] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 border border-amber-700/60 shadow-sm`}
        />
      ))}
    </div>
  );
}

/* プレイヤーアバター - ポートレート枠付き */
function PlayerAvatar({
  player,
  position,
}: {
  player: Player;
  position: TablePosition;
}) {
  const statusColor = player.hasSubmitted
    ? "border-blue-400"
    : player.hasDiscarded
      ? "border-green-400"
      : "border-slate-500";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`w-12 h-12 rounded-md border-2 ${statusColor} bg-slate-800/90 flex items-center justify-center text-2xl shadow-lg backdrop-blur-sm`}
      >
        {player.avatar}
      </div>
      <div className="bg-slate-900/80 backdrop-blur-sm rounded px-1.5 py-0.5 text-center">
        <div className="text-white text-[10px] font-bold leading-tight">
          {player.name}
        </div>
        {player.isCPU && (
          <div className="text-slate-400 text-[8px]">CPU</div>
        )}
      </div>
      {player.totalScore > 0 && (
        <div className="text-amber-400 text-[10px] font-bold">
          {player.totalScore}pt
        </div>
      )}
    </div>
  );
}

/* 中央情報パネル (じゃんたまの中央パネル風) */
function CenterPanel({
  round,
  maxRounds,
  remainingCount,
  players,
}: {
  round: number;
  maxRounds: number;
  remainingCount: number;
  players: Player[];
}) {
  return (
    <div className="relative w-28 h-28 bg-slate-800/90 rounded-lg border border-slate-600/80 shadow-xl flex flex-col items-center justify-center gap-1 backdrop-blur-sm">
      {/* 四方の風表示 */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-slate-500 text-[10px] font-bold">
        対
      </div>
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-amber-400 text-[10px] font-bold">
        自
      </div>
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">
        左
      </div>
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold">
        右
      </div>

      <div className="text-slate-400 text-[9px]">残り {remainingCount}</div>
      <div className="bg-blue-900/60 rounded px-2 py-0.5">
        <span className="text-cyan-300 text-xs font-bold">
          第{round}局
        </span>
      </div>
      <div className="text-amber-400 text-[10px] font-medium">
        全{maxRounds}局
      </div>

      {/* 各プレイヤースコア (小さく表示) */}
      <div className="flex gap-2 mt-0.5">
        {players.map((p) => (
          <div key={p.id} className="text-[8px] text-slate-400">
            {p.avatar}
            <span className="text-white ml-0.5">
              {p.totalScore}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GameTable({
  state,
  onDiscard,
  onSubmitArchitecture,
}: Props) {
  const [selectedDiscardIndices, setSelectedDiscardIndices] = useState<
    Set<number>
  >(new Set());
  const [selectedBuildIds, setSelectedBuildIds] = useState<Set<string>>(
    new Set()
  );

  const humanPlayer = state.players.find((p) => !p.isCPU)!;
  const positioned = getPlayerPositions(state.players);

  const isDrafting = state.phase === "drafting";
  const isBuilding = state.phase === "building";

  const topPlayer = positioned.find((p) => p.position === "top")!;
  const leftPlayer = positioned.find((p) => p.position === "left")!;
  const rightPlayer = positioned.find((p) => p.position === "right")!;

  const handleDiscardToggle = (index: number) => {
    setSelectedDiscardIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleDiscardConfirm = () => {
    if (!humanPlayer.hasDiscarded) {
      onDiscard(humanPlayer.id, Array.from(selectedDiscardIndices));
      setSelectedDiscardIndices(new Set());
    }
  };

  const handleBuildToggle = (resourceId: string) => {
    setSelectedBuildIds((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) next.delete(resourceId);
      else next.add(resourceId);
      return next;
    });
  };

  const handleBuildSubmit = () => {
    if (selectedBuildIds.size > 0 && !humanPlayer.hasSubmitted) {
      onSubmitArchitecture(humanPlayer.id, Array.from(selectedBuildIds));
      setSelectedBuildIds(new Set());
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 flex flex-col select-none">
      {/* Phase indicator - top left overlay */}
      <div className="absolute top-3 left-3 z-20">
        <span className="bg-slate-800/90 text-white px-3 py-1 rounded text-xs font-medium backdrop-blur-sm border border-slate-700/50">
          {isDrafting &&
            `ドラフトフェーズ - ラウンド ${state.round}/${state.maxRounds}`}
          {isBuilding && "構築フェーズ - リソースを選んで提出"}
        </span>
      </div>

      {/* Main table area - fills most of the screen */}
      <div
        className="flex-1 relative"
        style={{ perspective: "1200px" }}
      >
        {/* 3D table surface */}
        <div
          className="absolute inset-6 sm:inset-8 lg:inset-12"
          style={{
            transform: "rotateX(15deg)",
            transformOrigin: "center 70%",
          }}
        >
          {/* Table felt - dark navy blue */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 shadow-[inset_0_0_80px_rgba(0,0,0,0.5)] border-2 border-blue-800/40 overflow-hidden">
            {/* Subtle radial light from center */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(100,150,255,0.08)_0%,transparent_60%)]" />

            {/* Diagonal lines from center to corners */}
            <svg
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <line
                x1="50"
                y1="50"
                x2="0"
                y2="0"
                stroke="rgba(100,150,200,0.12)"
                strokeWidth="0.3"
              />
              <line
                x1="50"
                y1="50"
                x2="100"
                y2="0"
                stroke="rgba(100,150,200,0.12)"
                strokeWidth="0.3"
              />
              <line
                x1="50"
                y1="50"
                x2="0"
                y2="100"
                stroke="rgba(100,150,200,0.12)"
                strokeWidth="0.3"
              />
              <line
                x1="50"
                y1="50"
                x2="100"
                y2="100"
                stroke="rgba(100,150,200,0.12)"
                strokeWidth="0.3"
              />
              {/* Inner border rectangle */}
              <rect
                x="20"
                y="18"
                width="60"
                height="64"
                fill="none"
                stroke="rgba(100,150,200,0.1)"
                strokeWidth="0.3"
                rx="1"
              />
            </svg>

            {/* Center panel */}
            <div className="absolute inset-0 flex items-center justify-center">
              <CenterPanel
                round={state.round}
                maxRounds={state.maxRounds}
                remainingCount={state.resourcePool.length}
                players={state.players}
              />
            </div>

            {/* Top player (対面) - face-down tiles along top edge */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
              <FaceDownCards count={topPlayer.player.hand.length} />
            </div>

            {/* Left player - vertical face-down tiles along left edge */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <FaceDownCards
                count={leftPlayer.player.hand.length}
                vertical
              />
            </div>

            {/* Right player - vertical face-down tiles along right edge */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <FaceDownCards
                count={rightPlayer.player.hand.length}
                vertical
              />
            </div>
          </div>
        </div>

        {/* Player avatars - positioned outside/on table edge, NOT affected by perspective */}
        {/* Top player avatar */}
        <div className="absolute top-2 right-8 z-10">
          <PlayerAvatar
            player={topPlayer.player}
            position="top"
          />
        </div>

        {/* Left player avatar */}
        <div className="absolute left-2 top-16 z-10">
          <PlayerAvatar
            player={leftPlayer.player}
            position="left"
          />
        </div>

        {/* Right player avatar */}
        <div className="absolute right-2 top-16 z-10">
          <PlayerAvatar
            player={rightPlayer.player}
            position="right"
          />
        </div>

        {/* Bottom player avatar */}
        <div className="absolute bottom-2 left-8 z-10">
          <PlayerAvatar
            player={humanPlayer}
            position="bottom"
          />
        </div>
      </div>

      {/* Human player hand - fixed at bottom of screen, large tiles */}
      <div className="shrink-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-2 pb-2 px-4">
        <div className="flex gap-1 justify-center items-end">
          {humanPlayer.hand.map((resource, i) => {
            const isSelected = isDrafting
              ? selectedDiscardIndices.has(i)
              : isBuilding
                ? selectedBuildIds.has(resource.id)
                : false;

            return (
              <div
                key={resource.id}
                className="transition-transform duration-150"
                style={{
                  transform: isSelected
                    ? "translateY(-8px)"
                    : "translateY(0)",
                }}
              >
                <ResourceCard
                  resource={resource}
                  selected={isSelected}
                  onClick={
                    isDrafting && !humanPlayer.hasDiscarded
                      ? () => handleDiscardToggle(i)
                      : isBuilding && !humanPlayer.hasSubmitted
                        ? () => handleBuildToggle(resource.id)
                        : undefined
                  }
                />
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3 mt-2">
          {isDrafting && !humanPlayer.hasDiscarded && (
            <button
              onClick={handleDiscardConfirm}
              className="px-5 py-2 rounded-lg font-bold text-sm transition-colors bg-red-600 hover:bg-red-500 text-white shadow-lg"
            >
              {selectedDiscardIndices.size > 0
                ? `${selectedDiscardIndices.size}枚捨てる`
                : "捨てずに進む"}
            </button>
          )}

          {isDrafting && humanPlayer.hasDiscarded && (
            <div className="text-slate-400 text-sm py-2">
              他のプレイヤーの選択を待っています...
            </div>
          )}

          {isBuilding && !humanPlayer.hasSubmitted && (
            <button
              onClick={handleBuildSubmit}
              disabled={selectedBuildIds.size === 0}
              className={`px-5 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg ${
                selectedBuildIds.size > 0
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-slate-600 text-slate-400 cursor-not-allowed"
              }`}
            >
              アーキテクチャを提出する ({selectedBuildIds.size}個)
            </button>
          )}

          {isBuilding && humanPlayer.hasSubmitted && (
            <div className="text-slate-400 text-sm py-2">
              他のプレイヤーの提出を待っています...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

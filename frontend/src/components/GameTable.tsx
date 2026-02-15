"use client";

import { useState } from "react";
import { GameState } from "@/lib/types";
import PlayerSlot from "./PlayerSlot";
import ResourcePool from "./ResourcePool";
import ArchitecturePreview from "./ArchitecturePreview";

type Props = {
  state: GameState;
  onDiscard: (playerId: string, discardIndices: number[]) => void;
  onSubmitArchitecture: (playerId: string, resourceIds: string[]) => void;
};

export default function GameTable({ state, onDiscard, onSubmitArchitecture }: Props) {
  const [selectedDiscardIndices, setSelectedDiscardIndices] = useState<Set<number>>(new Set());
  const [selectedBuildIds, setSelectedBuildIds] = useState<Set<string>>(new Set());

  const humanPlayer = state.players.find((p) => !p.isCPU)!;
  const cpuPlayers = state.players.filter((p) => p.isCPU);

  const isDrafting = state.phase === "drafting";
  const isBuilding = state.phase === "building";

  const handleDiscardToggle = (index: number) => {
    setSelectedDiscardIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
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
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
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
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Phase indicator */}
        <div className="text-center mb-4">
          <span className="bg-slate-700 text-white px-4 py-1.5 rounded-full text-sm font-medium">
            {isDrafting && `ドラフトフェーズ - ラウンド ${state.round}/${state.maxRounds}`}
            {isBuilding && "構築フェーズ - リソースを選んで提出"}
          </span>
        </div>

        {/* CPU Players (top row) */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {cpuPlayers.map((cpu) => (
            <PlayerSlot
              key={cpu.id}
              player={cpu}
              showHand={false}
            />
          ))}
        </div>

        {/* Center: Resource Pool */}
        <div className="flex justify-center my-6">
          <ResourcePool
            remainingCount={state.resourcePool.length}
            round={state.round}
            maxRounds={state.maxRounds}
          />
        </div>

        {/* Human Player */}
        <div className="mt-4">
          <PlayerSlot
            player={humanPlayer}
            isCurrentUser
            showHand
            onCardClick={
              isDrafting && !humanPlayer.hasDiscarded
                ? (i) => handleDiscardToggle(i)
                : undefined
            }
            selectedCardIndices={isDrafting ? selectedDiscardIndices : undefined}
          />

          {/* Building phase: resource selection */}
          {isBuilding && !humanPlayer.hasSubmitted && (
            <div className="mt-4 bg-slate-800 rounded-xl p-4 border border-slate-600">
              <p className="text-white text-sm font-medium text-center mb-3">
                アーキテクチャに使うリソースを選択してください
              </p>
              <ArchitecturePreview
                resources={humanPlayer.hand}
                selectedIds={selectedBuildIds}
                onToggle={handleBuildToggle}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-center gap-3 mt-4">
            {isDrafting && !humanPlayer.hasDiscarded && (
              <button
                onClick={handleDiscardConfirm}
                className="px-6 py-2.5 rounded-lg font-bold text-sm transition-colors bg-red-600 hover:bg-red-500 text-white"
              >
                {selectedDiscardIndices.size > 0
                  ? `${selectedDiscardIndices.size}枚捨てる`
                  : "捨てずに進む"}
              </button>
            )}

            {isDrafting && humanPlayer.hasDiscarded && (
              <div className="text-slate-400 text-sm py-2.5">
                他のプレイヤーの選択を待っています...
              </div>
            )}

            {isBuilding && !humanPlayer.hasSubmitted && (
              <button
                onClick={handleBuildSubmit}
                disabled={selectedBuildIds.size === 0}
                className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors ${
                  selectedBuildIds.size > 0
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-slate-600 text-slate-400 cursor-not-allowed"
                }`}
              >
                アーキテクチャを提出する ({selectedBuildIds.size}個選択中)
              </button>
            )}

            {isBuilding && humanPlayer.hasSubmitted && (
              <div className="text-slate-400 text-sm py-2.5">
                他のプレイヤーの提出を待っています...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

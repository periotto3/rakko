"use client";

import { BabanukiPlayer } from "../lib/types";

interface ResultScreenProps {
  winner: BabanukiPlayer;
  players: BabanukiPlayer[];
  onRematch: () => void;
}

export default function ResultScreen({
  winner,
  players,
  onRematch,
}: ResultScreenProps) {
  const sorted = [...players].sort((a, b) => {
    const aHasJoker = a.hand.some((c) => c.suit === "joker");
    const bHasJoker = b.hand.some((c) => c.suit === "joker");
    if (aHasJoker && !bHasJoker) return 1;
    if (!aHasJoker && bHasJoker) return -1;
    if (a.finishedOrder === null) return 1;
    if (b.finishedOrder === null) return -1;
    return a.finishedOrder - b.finishedOrder;
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-white px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="mb-6">
          <span className="text-5xl">🏆</span>
          <h1 className="text-3xl font-bold mt-2">
            {winner.name}さんの優勝！
          </h1>
        </div>

        <div className="space-y-3 mb-8">
          {sorted.map((player, i) => {
            const hasJoker = player.hand.some((c) => c.suit === "joker");
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  i === 0
                    ? "bg-yellow-100 border-2 border-yellow-400"
                    : hasJoker
                      ? "bg-red-50 border border-red-200"
                      : "bg-gray-50 border border-gray-200"
                }`}
              >
                <span className="text-2xl">
                  {hasJoker ? "💀" : medals[i] || `${i + 1}位`}
                </span>
                <span className="text-2xl">{player.avatar}</span>
                <span className="font-bold flex-1 text-left">
                  {player.name}
                </span>
                <span className="text-sm text-gray-500">
                  {hasJoker
                    ? "ジョーカー保持"
                    : `${player.finishedOrder}位上がり`}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onRematch}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-lg transition-all active:scale-95 shadow-lg"
        >
          再対戦
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { GameMode } from "../lib/types";

interface TitleScreenProps {
  onStart: (mode: GameMode, playerName?: string) => void;
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  const [showRules, setShowRules] = useState(false);
  const [showOnlineForm, setShowOnlineForm] = useState(false);
  const [playerName, setPlayerName] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-100">
      <div className="bg-green-600 rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
        {/* Decorative border */}
        <div className="absolute inset-2 border-2 border-green-300/40 rounded-2xl pointer-events-none" />

        {/* Sparkles */}
        <div className="absolute top-4 left-6 text-yellow-300 text-xl animate-pulse">✦</div>
        <div className="absolute top-8 right-8 text-yellow-300 text-sm animate-pulse delay-300">✦</div>
        <div className="absolute bottom-24 right-6 text-yellow-300 text-lg animate-pulse delay-700">✦</div>
        <div className="absolute bottom-32 left-8 text-yellow-300 text-sm animate-pulse delay-500">✦</div>

        {/* Title */}
        <div className="text-center mb-8 relative z-10">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg tracking-wider">
            ババ抜き
          </h1>
        </div>

        {/* Cards & Character */}
        <div className="flex items-center justify-center gap-2 mb-8 relative z-10">
          {/* Cards */}
          <div className="flex -space-x-4">
            <div className="w-12 h-18 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center text-xs font-bold transform -rotate-12">
              <span className="text-black">2♣</span>
            </div>
            <div className="w-12 h-18 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center text-xs font-bold transform -rotate-4">
              <span className="text-red-500">4♥</span>
            </div>
            <div className="w-12 h-18 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center text-xs font-bold transform rotate-4">
              <span className="text-red-500">10♦</span>
            </div>
            <div className="w-12 h-18 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center text-xs font-bold transform rotate-12">
              <span className="text-black">K♠</span>
            </div>
          </div>

          {/* Character (rabbit-like mascot) */}
          <div className="text-6xl ml-4">🐰</div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 relative z-10">
          <button
            onClick={() => onStart("cpu")}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg transition-all active:scale-95"
          >
            CPUと遊ぶ
          </button>
          <button
            onClick={() => setShowOnlineForm(true)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg transition-all active:scale-95"
          >
            オンライン
          </button>
        </div>
        <div className="mt-3 relative z-10">
          <button
            onClick={() => setShowRules(true)}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-6 rounded-xl text-base shadow-lg transition-all active:scale-95"
          >
            ルール説明
          </button>
        </div>
      </div>

      {/* Online mode: player name input modal */}
      {showOnlineForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowOnlineForm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-center">オンライン対戦</h2>
            <p className="text-gray-600 text-sm mb-4 text-center">プレイヤー名を入力してください</p>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && playerName.trim()) {
                  onStart("online", playerName.trim());
                }
              }}
              placeholder="あなたの名前"
              maxLength={20}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            <button
              onClick={() => onStart("online", playerName.trim() || "プレイヤー")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95"
            >
              マッチングを開始
            </button>
            <button
              onClick={() => setShowOnlineForm(false)}
              className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Rules modal */}
      {showRules && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRules(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-center">ルール説明</h2>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>1. 53枚のカード（ジョーカー1枚含む）を全員に配ります</li>
              <li>2. 同じ数字のカードが2枚あればペアとして捨てます</li>
              <li>3. 順番に隣のプレイヤーからカードを1枚引きます</li>
              <li>4. 引いたカードでペアができたら捨てます</li>
              <li>5. 手札がなくなったプレイヤーから上がりです</li>
              <li>6. 最後にジョーカーが残った人が負けです</li>
            </ul>
            <button
              onClick={() => setShowRules(false)}
              className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              とじる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

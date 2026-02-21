"use client";

import { useState, useEffect, useRef } from "react";
import { BabanukiPlayer, ThemeSlot } from "../lib/types";
import PlayerAvatar from "./PlayerAvatar";
import {
  THEME_WORK,
  THEME_WHEN,
  THEME_WHERE,
  THEME_STYLE,
} from "../lib/engine";
import type { GameMode } from "./TitleScreen";
import type { GameService } from "../services/gameService";

interface WaitingScreenProps {
  mode: GameMode;
  gameService: GameService;
  maxPlayers: number;
  // CPU モード専用
  players: BabanukiPlayer[];
  onThemeDecided: (theme: ThemeSlot) => void;
}

const SLOT_KEYS: (keyof ThemeSlot)[] = ["work", "when", "where", "style"];
const SLOT_ITEMS: Record<keyof ThemeSlot, string[]> = {
  work: THEME_WORK,
  when: THEME_WHEN,
  where: THEME_WHERE,
  style: THEME_STYLE,
};
const SLOT_LABELS: Record<keyof ThemeSlot, string> = {
  work: "作品",
  when: "いつ",
  where: "どこで",
  style: "画風",
};

function SlotReel({
  items,
  spinning,
  finalValue,
  locked,
  label,
}: {
  items: string[];
  spinning: boolean;
  finalValue: string;
  locked: boolean;
  label: string;
}) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (spinning) {
      intervalRef.current = setInterval(() => {
        setDisplayIndex((prev) => (prev + 1) % items.length);
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const idx = items.indexOf(finalValue);
      if (idx !== -1) setDisplayIndex(idx);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spinning, finalValue, items]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 text-right shrink-0">
        {label}
      </span>
      <div
        className={`
          flex-1 border-2 rounded-lg px-4 py-3 text-center font-bold overflow-hidden h-12 flex items-center justify-center transition-colors
          ${locked ? "border-green-500 bg-green-50 text-green-800" : "border-gray-800 bg-white text-gray-800"}
          ${!locked && !spinning ? "border-gray-300 bg-gray-50 text-gray-400" : ""}
        `}
      >
        <span className={spinning ? "animate-pulse" : ""}>
          {locked || spinning ? items[displayIndex] : "---"}
        </span>
      </div>
      {locked && (
        <span className="text-green-500 text-lg shrink-0">✓</span>
      )}
    </div>
  );
}

export default function WaitingScreen({
  mode,
  gameService,
  players,
  maxPlayers,
  onThemeDecided,
}: WaitingScreenProps) {
  // オンラインモード用：待機人数
  const [waitingCount, setWaitingCount] = useState(1);

  // オンラインモード：onWaiting のみ購読（onGameStart は page.tsx で管理）
  useEffect(() => {
    if (mode !== "online") return;
    gameService.onWaiting((count) => setWaitingCount(count));
  }, [mode, gameService]);
  const [nextSlotIndex, setNextSlotIndex] = useState(0);
  const [spinningSlot, setSpinningSlot] = useState<number | null>(null);
  const [theme, setTheme] = useState<ThemeSlot>({
    work: THEME_WORK[0],
    when: THEME_WHEN[0],
    where: THEME_WHERE[0],
    style: THEME_STYLE[0],
  });
  const [decided, setDecided] = useState(false);

  const prevPlayerCount = useRef(0);
  useEffect(() => {
    if (players.length > prevPlayerCount.current && nextSlotIndex < SLOT_KEYS.length && !decided) {
      const slotIdx = nextSlotIndex;
      setSpinningSlot(slotIdx);

      const key = SLOT_KEYS[slotIdx];
      const items = SLOT_ITEMS[key];
      const pick = items[Math.floor(Math.random() * items.length)];

      setTimeout(() => {
        setTheme((prev) => ({ ...prev, [key]: pick }));
        setSpinningSlot(null);
        setNextSlotIndex(slotIdx + 1);
      }, 1500);
    }
    prevPlayerCount.current = players.length;
  }, [players.length, nextSlotIndex, decided]);

  const handleDecide = () => {
    setDecided(true);
    onThemeDecided(theme);
  };

  const allJoined = players.length >= maxPlayers;
  const allSlotsLocked = nextSlotIndex >= SLOT_KEYS.length;

  // オンラインモード：シンプルな待機画面
  if (mode === "online") {
    const AVATARS = ["/avatars/user.png", "/avatars/cpu_1.png", "/avatars/cpu_2.png", "/avatars/cpu_3.png"];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <h1 className="text-3xl font-bold mb-2">
          {waitingCount >= maxPlayers ? "全員そろいました！" : `マッチング中...`}
        </h1>
        <p className="text-gray-500 mb-8">{waitingCount}/{maxPlayers}人が待機中</p>

        <div className="flex gap-4 mb-10">
          {Array.from({ length: maxPlayers }).map((_, i) => (
            <div key={i} className={`flex flex-col items-center transition-opacity ${i < waitingCount ? "opacity-100" : "opacity-20"}`}>
              <PlayerAvatar src={AVATARS[i]} name={`プレイヤー${i + 1}`} size={40} />
              <span className={`text-xs mt-1 ${i < waitingCount ? "text-gray-700" : "text-gray-300"}`}>
                {i < waitingCount ? "参加済" : "待機中"}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-blue-500 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        <button
          onClick={() => window.location.reload()}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-6 rounded-xl text-sm transition-all"
        >
          キャンセル
        </button>
      </div>
    );
  }

  // CPUモード：既存のテーマルーレットUI
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <h1 className="text-3xl font-bold mb-2">
        {allJoined ? "全員そろいました！" : `${players.length}/${maxPlayers}人を待っています...`}
      </h1>

      <div className="flex gap-3 mb-8">
        {players.map((p) => (
          <div key={p.id} className="flex flex-col items-center">
            <PlayerAvatar src={p.avatar} name={p.name} size={36} />
            <span className="text-xs text-gray-600 mt-1">{p.name}</span>
          </div>
        ))}
        {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
          <div key={`empty-${i}`} className="flex flex-col items-center opacity-30">
            <span className="text-3xl">❓</span>
            <span className="text-xs text-gray-400 mt-1">待機中</span>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold mb-4">テーマルーレット</h2>

      <div className="bg-yellow-200 rounded-2xl p-6 w-full max-w-sm shadow-lg">
        <div className="space-y-3">
          {SLOT_KEYS.map((key, i) => (
            <SlotReel
              key={key}
              items={SLOT_ITEMS[key]}
              spinning={spinningSlot === i}
              finalValue={theme[key]}
              locked={i < nextSlotIndex}
              label={SLOT_LABELS[key]}
            />
          ))}
        </div>

        <div className="mt-4 flex gap-1 justify-center">
          {SLOT_KEYS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < nextSlotIndex
                  ? "bg-green-500"
                  : spinningSlot === i
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {allJoined && allSlotsLocked && !decided && spinningSlot === null && (
        <button
          onClick={handleDecide}
          className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all active:scale-95"
        >
          このテーマで始める
        </button>
      )}

      <button
        onClick={() => window.location.reload()}
        className="mt-4 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-2 px-6 rounded-xl text-sm transition-all"
      >
        ホームに戻る
      </button>
    </div>
  );
}

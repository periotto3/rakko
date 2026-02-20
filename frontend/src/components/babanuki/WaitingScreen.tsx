"use client";

import { useState, useEffect, useRef } from "react";
import { BabanukiPlayer, ThemeSlot } from "@/lib/babanuki/types";
import {
  THEME_WHO,
  THEME_WHEN,
  THEME_WHERE,
  THEME_WHAT,
} from "@/lib/babanuki/engine";

interface WaitingScreenProps {
  players: BabanukiPlayer[];
  maxPlayers: number;
  onThemeDecided: (theme: ThemeSlot) => void;
}

const SLOT_KEYS: (keyof ThemeSlot)[] = ["who", "when", "where", "what"];
const SLOT_ITEMS: Record<keyof ThemeSlot, string[]> = {
  who: THEME_WHO,
  when: THEME_WHEN,
  where: THEME_WHERE,
  what: THEME_WHAT,
};
const SLOT_LABELS: Record<keyof ThemeSlot, string> = {
  who: "だれが",
  when: "いつ",
  where: "どこで",
  what: "なにを",
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
  players,
  maxPlayers,
  onThemeDecided,
}: WaitingScreenProps) {
  // Track which slot index to spin next (0=who, 1=when, 2=where, 3=what)
  const [nextSlotIndex, setNextSlotIndex] = useState(0);
  const [spinningSlot, setSpinningSlot] = useState<number | null>(null);
  const [theme, setTheme] = useState<ThemeSlot>({
    who: THEME_WHO[0],
    when: THEME_WHEN[0],
    where: THEME_WHERE[0],
    what: THEME_WHAT[0],
  });
  const [decided, setDecided] = useState(false);

  // Spin one slot when a new player joins
  const prevPlayerCount = useRef(players.length);
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      {/* Player count */}
      <h1 className="text-3xl font-bold mb-2">
        {allJoined ? "全員そろいました！" : `${players.length}/${maxPlayers}人を待っています...`}
      </h1>

      {/* Player avatars */}
      <div className="flex gap-3 mb-8">
        {players.map((p) => (
          <div key={p.id} className="flex flex-col items-center">
            <span className="text-3xl">{p.avatar}</span>
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

      {/* Theme roulette */}
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

        {/* Progress indicator */}
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

      {/* Start button - show when all joined AND all slots decided */}
      {allJoined && allSlotsLocked && !decided && spinningSlot === null && (
        <button
          onClick={handleDecide}
          className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all active:scale-95"
        >
          このテーマで始める
        </button>
      )}

      {/* Home button */}
      <button
        onClick={() => window.location.reload()}
        className="mt-4 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-2 px-6 rounded-xl text-sm transition-all"
      >
        ホームに戻る
      </button>
    </div>
  );
}

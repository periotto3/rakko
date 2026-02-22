"use client";

import { useState, useEffect, useRef } from "react";
import { BabanukiPlayer, ThemeSlot } from "../lib/types";
import PlayerAvatar from "./PlayerAvatar";
import {
  THEME_WHO,
  THEME_WHEN,
  THEME_WHERE,
  THEME_WHAT,
} from "../lib/engine";
import type { GameMode } from "../lib/types";
import type { GameService, RouletteSlotData } from "../services/gameService";

interface WaitingScreenProps {
  mode: GameMode;
  gameService: GameService;
  maxPlayers: number;
  // CPU モード専用
  players: BabanukiPlayer[];
  onThemeDecided: (theme: ThemeSlot) => void;
  // オンラインモード専用
  isGenerating?: boolean;
  imageGenError?: string | null;
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

const ONLINE_AVATARS = [
  "/avatars/user.png",
  "/avatars/cpu_1.png",
  "/avatars/cpu_2.png",
  "/avatars/cpu_3.png",
];

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
  players: initialPlayers,
  maxPlayers,
  onThemeDecided,
  isGenerating = false,
  imageGenError = null,
}: WaitingScreenProps) {
  const [waitingCount, setWaitingCount] = useState(1);
  const [players, setPlayers] = useState<BabanukiPlayer[]>(initialPlayers);
  // 確定済みスロット一覧（decidedSlots ベースで管理）
  const [lockedSlots, setLockedSlots] = useState<RouletteSlotData[]>([]);
  const [theme, setTheme] = useState<ThemeSlot>({
    who: THEME_WHO[0],
    when: THEME_WHEN[0],
    where: THEME_WHERE[0],
    what: THEME_WHAT[0],
  });
  const [decided, setDecided] = useState(false);
  const pendingSlotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // オンラインモード：待機人数を購読
  useEffect(() => {
    if (mode !== "online") return;
    gameService.onWaiting((count) => setWaitingCount(count));
  }, [mode, gameService]);

  // オンラインモード：プレイヤー情報を購読
  useEffect(() => {
    if (mode !== "online") return;
    gameService.onWaitingPlayers((onlinePlayers) => setPlayers(onlinePlayers));
  }, [mode, gameService]);

  // CPU モード：initialPlayers が変更されたら更新
  useEffect(() => {
    if (mode === "cpu") {
      setPlayers(initialPlayers);
    }
  }, [mode, initialPlayers]);

  // CPU/Online 共通：スロット確定イベントを購読
  useEffect(() => {
    gameService.onWaitingSlot((slot, allSlots) => {
      // 古いタイマーをキャンセルして状態の巻き戻しを防止
      if (pendingSlotTimerRef.current) clearTimeout(pendingSlotTimerRef.current);
      // 確定済み値を theme に反映
      setTheme((prev) => {
        const next = { ...prev };
        allSlots.forEach((s) => { (next as Record<string, string>)[s.key] = s.value; });
        return next;
      });
      // 新スロット以外は即座にロック（再参加などで複数スロット確定済みの場合に対応）
      setLockedSlots(allSlots.filter((s) => s.slotIndex !== slot.slotIndex));
      // 新スロットは 1500ms アニメーション後にロック
      pendingSlotTimerRef.current = setTimeout(() => {
        setLockedSlots(allSlots);
        pendingSlotTimerRef.current = null;
      }, 1500);
    });
  }, [gameService]);

  const handleDecide = () => {
    setDecided(true);
    onThemeDecided(theme);
  };

  const displayCount = mode === "cpu" ? players.length : waitingCount;
  const allJoined = displayCount >= maxPlayers;
  const allSlotsLocked = lockedSlots.length >= SLOT_KEYS.length;


  // オンライン：画像生成エラー
  if (mode === "online" && imageGenError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600 mb-2">エラーが発生しました</h1>
        <p className="text-gray-500 mb-8">{imageGenError}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl text-sm transition-all"
        >
          もう一度試す
        </button>
      </div>
    );
  }

  // オンライン：画像生成中
  if (mode === "online" && isGenerating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6" />
        <h1 className="text-2xl font-bold mb-2">背景画像を生成中...</h1>
        <p className="text-gray-400 text-sm">AIがゲーム用の画像を作成しています</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <h1 className="text-3xl font-bold mb-2">
        {allJoined
          ? "全員そろいました！"
          : mode === "online"
            ? "マッチング中..."
            : `${displayCount}/${maxPlayers}人を待っています...`}
      </h1>
      <p className="text-gray-500 mb-6">{displayCount}/{maxPlayers}人が待機中</p>


      {/* アバター表示 */}
      <div className="flex gap-3 mb-8">
        {/* 参加済みプレイヤー */}
        {players.map((p) => (
          <div key={p.id} className="flex flex-col items-center">
            <PlayerAvatar src={p.avatar} name={p.name} size={36} />
            <span className="text-xs text-gray-600 mt-1">{p.name}</span>
          </div>
        ))}

        {/* 空席プレースホルダー */}
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
              spinning={!lockedSlots.some((s) => s.key === key)}
              finalValue={theme[key]}
              locked={lockedSlots.some((s) => s.key === key)}
              label={SLOT_LABELS[key]}
            />
          ))}
        </div>

        <div className="mt-4 flex gap-1 justify-center">
          {SLOT_KEYS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                lockedSlots.some((s) => s.key === SLOT_KEYS[i])
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* CPU のみ: 全員揃い・全スロット確定後にボタン表示 */}
      {mode === "cpu" && allJoined && allSlotsLocked && !decided && (
        <button
          onClick={handleDecide}
          className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all active:scale-95"
        >
          このテーマで始める
        </button>
      )}

      {/* Online のみ: 全スロット確定後にメッセージ表示 */}
      {mode === "online" && allSlotsLocked && (
        <p className="mt-6 text-gray-500 animate-pulse">まもなくゲームが始まります...</p>
      )}

      <button
        onClick={() => window.location.reload()}
        className={`mt-4 font-bold py-2 px-6 rounded-xl text-sm transition-all ${
          mode === "online"
            ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
            : "bg-yellow-400 hover:bg-yellow-500 text-gray-800"
        }`}
      >
        {mode === "online" ? "キャンセル" : "ホームに戻る"}
      </button>
    </div>
  );
}

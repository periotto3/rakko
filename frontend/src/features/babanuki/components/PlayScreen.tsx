"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BabanukiPlayer, Card, ThemeSlot } from "../lib/types";
import PlayerAvatar from "./PlayerAvatar";
import {
  drawCard,
  cpuChooseCard,
  getDrawTarget,
  getNextActivePlayer,
  isGameOver,
  getWinner,
} from "../lib/engine";

interface PlayScreenProps {
  initialPlayers: BabanukiPlayer[];
  theme: ThemeSlot;
  onGameEnd: (winner: BabanukiPlayer, players: BabanukiPlayer[]) => void;
  backgroundImage?: string;
}

const SUIT_SYMBOLS: Record<string, string> = {
  compute: "⚡",
  storage: "🪣",
  database: "🗄️",
  network: "🌐",
  frontend: "🖥️",
  management: "🛠️",
  joker: "💸",
};

const SUIT_COLORS: Record<string, string> = {
  compute: "#E07B39",  // AWS オレンジ
  storage: "#7AA116",  // グリーン
  database: "#2E73B8", // ブルー
  network: "#8C4FFF",  // パープル
  frontend: "#F59E42", // オレンジ
  management: "#6B7280", // グレー
  joker: "#7c3aed",
};

/* ─── Card Components ─── */

function CardFace({ card, highlighted, large }: { card: Card; highlighted?: boolean; large?: boolean }) {
  const isJoker = card.suit === "joker";
  const color = SUIT_COLORS[card.suit];
  return (
    <div
      className={`relative ${large ? "w-[78px] h-[111px]" : "w-[52px] h-[74px]"} rounded-lg shadow-lg flex flex-col items-center justify-center select-none shrink-0 transition-transform duration-200
        ${highlighted ? "border-2 border-yellow-400 ring-2 ring-yellow-300 scale-110 -translate-y-2" : "border border-gray-300"}`}
      style={{
        background: isJoker
          ? "linear-gradient(135deg, #faf5ff, #fce7f3)"
          : "linear-gradient(135deg, #ffffff, #f8f8f8)",
      }}
    >
      {isJoker ? (
        <>
          <span className={`${large ? "text-3xl" : "text-xl"} leading-none`}>💸</span>
          <span className={`${large ? "text-[10px]" : "text-[7px]"} font-bold`} style={{ color: "#7c3aed" }}>
            請求書
          </span>
        </>
      ) : (
        <>
          <span
            className={`${large ? "text-[12px]" : "text-[8px]"} font-bold leading-none absolute top-0.5 left-1`}
            style={{ color }}
          >
            {card.label}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt={card.label}
            width={large ? 45 : 30}
            height={large ? 45 : 30}
            className="object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "block";
            }}
          />
          <span className={`${large ? "text-3xl" : "text-xl"} leading-none hidden`} style={{ color }}>
            {SUIT_SYMBOLS[card.suit]}
          </span>
        </>
      )}
    </div>
  );
}

function CardBack({
  onClick,
  highlighted,
  small,
  large,
  compact,
}: {
  onClick?: () => void;
  highlighted?: boolean;
  small?: boolean;
  large?: boolean;
  compact?: boolean;
}) {
  const sizeClass = small
    ? "w-[22px] h-[30px]"
    : large
    ? "w-[78px] h-[111px]"
    : compact
    ? "w-[38px] h-[54px]"
    : "w-[52px] h-[74px]";
  const innerClass = large
    ? "w-[58px] h-[90px]"
    : compact
    ? "w-[28px] h-[42px]"
    : "w-[38px] h-[58px]";

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${sizeClass} rounded-lg shadow-lg border-2 flex items-center justify-center select-none shrink-0 transition-transform duration-150
        ${onClick ? "cursor-pointer hover:scale-110 hover:-translate-y-1" : "cursor-default"}
        ${highlighted ? "border-yellow-400 ring-2 ring-yellow-300" : "border-blue-900"}
      `}
      style={{
        background: highlighted
          ? "linear-gradient(135deg, #1e40af, #3b82f6)"
          : "linear-gradient(135deg, #1e3a5f, #1e40af)",
      }}
    >
      {!small && (
        <div className={`${innerClass} rounded border border-white/20 flex items-center justify-center`}>
          <span className={`text-white/60 ${large ? "text-xl" : compact ? "text-xs" : "text-lg"}`}>☁</span>
        </div>
      )}
    </button>
  );
}

/* ─── Opponent Character ─── */

function OpponentCharacter({
  player,
  isCurrentTurn,
  isTarget,
  onCardClick,
  position,
}: {
  player: BabanukiPlayer;
  isCurrentTurn: boolean;
  isTarget: boolean;
  onCardClick?: (index: number) => void;
  position: "left" | "top" | "right";
}) {
  const finished = player.hand.length === 0;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* アバターとプレイヤー情報 */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`relative transition-all ${isCurrentTurn ? "scale-110" : ""}`}
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2
              ${isCurrentTurn ? "border-yellow-400 bg-yellow-900/40 animate-pulse" : "border-white/30 bg-black/30"}`}
          >
            <PlayerAvatar src={player.avatar} name={player.name} size={60} />
          </div>
          {isCurrentTurn && !finished && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-[7px] font-bold">&#x25B6;</span>
            </div>
          )}
        </div>

        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-center border border-white/10">
          <div className="text-white text-xs font-bold">{player.name}</div>
          <div className="text-[10px] text-gray-300">
            {finished ? (
              <span className="text-green-400">&#x2714; 上がり!</span>
            ) : (
              `${player.hand.length}枚`
            )}
          </div>
        </div>
      </div>

      {/* 手札 */}
      {!finished && (
        <div
          className="flex gap-1 flex-wrap justify-center relative z-20"
          style={position === "right" ? { maxWidth: isTarget ? "406px" : "206px" } : undefined}
        >
          {player.hand.map((_, idx) => (
            <CardBack
              key={idx}
              onClick={onCardClick ? () => onCardClick(idx) : undefined}
              highlighted={isTarget}
              large={isTarget}
              compact={!isTarget}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Player Hand ─── */

function PlayerHand({ player, highlightedRank }: { player: BabanukiPlayer; highlightedRank?: number | null }) {
  const finished = player.hand.length === 0;

  if (finished) {
    return (
      <div className="text-center text-green-400 font-bold text-lg py-4">
        &#x2714; 上がり!
      </div>
    );
  }

  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {player.hand.map((card) => (
        <CardFace key={card.id} card={card} highlighted={highlightedRank != null && card.rank === highlightedRank} />
      ))}
    </div>
  );
}

/* ─── Main PlayScreen ─── */

export default function PlayScreen({
  initialPlayers,
  theme,
  onGameEnd,
  backgroundImage,
}: PlayScreenProps) {
  const [players, setPlayers] = useState(initialPlayers);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(() =>
    getDrawTarget(initialPlayers, 0)
  );
  const [message, setMessage] = useState(
    "あなたのターンです。相手のカードをクリックして引いてください！"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [finishedCount, setFinishedCount] = useState(0);
  const [lastDrawnInfo, setLastDrawnInfo] = useState<string | null>(null);
  const [drawnCardPreview, setDrawnCardPreview] = useState<Card | null>(null);
  const [highlightedRank, setHighlightedRank] = useState<number | null>(null);

  const processingRef = useRef(false);
  const cpuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const themeText = `${theme.work} / ${theme.when} / ${theme.where} / ${theme.style}`;

  useEffect(() => {
    return () => {
      if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current);
    };
  }, []);

  const executeTurn = useCallback(
    (
      turnPlayers: BabanukiPlayer[],
      turnIndex: number,
      turnTarget: number,
      turnFinished: number
    ) => {
      if (turnTarget === -1 || turnPlayers[turnTarget].hand.length === 0) {
        processingRef.current = false;
        setIsProcessing(false);
        return;
      }

      const cardIdx = cpuChooseCard(turnPlayers[turnTarget].hand.length);
      const drawnCard = turnPlayers[turnTarget].hand[cardIdx];
      const cpuName = turnPlayers[turnIndex].name;

      const result = drawCard(
        turnPlayers,
        turnIndex,
        turnTarget,
        cardIdx,
        turnFinished
      );

      if (drawnCard) {
        const wasPaired =
          result.players[turnIndex].hand.length <
          turnPlayers[turnIndex].hand.length;
        if (wasPaired) {
          setLastDrawnInfo(`${cpuName}がペアを捨てた！`);
        } else {
          setLastDrawnInfo(`${cpuName}がカードを引いた`);
        }
      }

      setPlayers(result.players);
      setFinishedCount(result.finishedCount);

      const afterDraw = () => {
        if (isGameOver(result.players)) {
          const final = result.players.map((p) => {
            if (p.hand.length > 0 && p.finishedOrder === null) {
              return { ...p, finishedOrder: result.finishedCount + 1 };
            }
            return p;
          });
          setPlayers(final);
          processingRef.current = false;
          setIsProcessing(false);
          const winner = getWinner(final);
          setTimeout(() => onGameEnd(winner, final), 1500);
          return;
        }

        const next = getNextActivePlayer(result.players, turnIndex);
        const nextTarget = getDrawTarget(result.players, next);
        setCurrentTurnIndex(next);
        setTargetIndex(nextTarget);

        if (!result.players[next].isCPU) {
          setMessage(
            "あなたのターンです。相手のカードをクリックして引いてください！"
          );
          processingRef.current = false;
          setIsProcessing(false);
        } else {
          setMessage(`${result.players[next].name}のターン...`);
          const delay = 800 + Math.random() * 700;
          cpuTimeoutRef.current = setTimeout(() => {
            executeTurn(
              result.players,
              next,
              nextTarget,
              result.finishedCount
            );
          }, delay);
        }
      };

      if (result.newlyFinished.length > 0) {
        const names = result.newlyFinished
          .map((i) => result.players[i].name)
          .join("と");
        setMessage(`${names}が上がり！`);
        cpuTimeoutRef.current = setTimeout(afterDraw, 1000);
      } else {
        afterDraw();
      }
    },
    [onGameEnd]
  );

  useEffect(() => {
    if (processingRef.current) return;
    if (players[currentTurnIndex]?.isCPU && !isGameOver(players)) {
      processingRef.current = true;
      setIsProcessing(true);
      const delay = 800 + Math.random() * 700;
      cpuTimeoutRef.current = setTimeout(() => {
        executeTurn(players, currentTurnIndex, targetIndex, finishedCount);
      }, delay);
    }
  }, [currentTurnIndex, players, targetIndex, finishedCount, executeTurn]);

  const handlePlayerDraw = (cardIndex: number) => {
    if (processingRef.current || players[currentTurnIndex].isCPU) return;
    processingRef.current = true;
    setIsProcessing(true);

    const drawnCard = players[targetIndex].hand[cardIndex];
    if (drawnCard) {
      setDrawnCardPreview(drawnCard);
      const wouldPair = players[currentTurnIndex].hand.some(
        (c) => c.rank === drawnCard.rank
      );
      if (wouldPair) setHighlightedRank(drawnCard.rank);
    }

    cpuTimeoutRef.current = setTimeout(() => {
      setDrawnCardPreview(null);
      setHighlightedRank(null);

      const result = drawCard(
        players,
        currentTurnIndex,
        targetIndex,
        cardIndex,
        finishedCount
      );

      if (drawnCard) {
        const isJoker = drawnCard.suit === "joker";
        const wasPaired =
          result.players[currentTurnIndex].hand.length <
          players[currentTurnIndex].hand.length;
        if (isJoker) {
          setLastDrawnInfo("AWSの請求書を引いた！💸");
        } else if (wasPaired) {
          setLastDrawnInfo(
            `${drawnCard.label}${SUIT_SYMBOLS[drawnCard.suit]}でペア！`
          );
        } else {
          setLastDrawnInfo(
            `${drawnCard.label}${SUIT_SYMBOLS[drawnCard.suit]}を引いた`
          );
        }
      }

      setPlayers(result.players);
      setFinishedCount(result.finishedCount);

      const afterDraw = () => {
        if (isGameOver(result.players)) {
          const final = result.players.map((p) => {
            if (p.hand.length > 0 && p.finishedOrder === null) {
              return { ...p, finishedOrder: result.finishedCount + 1 };
            }
            return p;
          });
          setPlayers(final);
          processingRef.current = false;
          setIsProcessing(false);
          const winner = getWinner(final);
          setTimeout(() => onGameEnd(winner, final), 1500);
          return;
        }

        const next = getNextActivePlayer(result.players, currentTurnIndex);
        const nextTarget = getDrawTarget(result.players, next);
        setCurrentTurnIndex(next);
        setTargetIndex(nextTarget);

        if (!result.players[next].isCPU) {
          setMessage(
            "あなたのターンです。相手のカードをクリックして引いてください！"
          );
          processingRef.current = false;
          setIsProcessing(false);
        } else {
          setMessage(`${result.players[next].name}のターン...`);
          const delay = 800 + Math.random() * 700;
          cpuTimeoutRef.current = setTimeout(() => {
            executeTurn(result.players, next, nextTarget, result.finishedCount);
          }, delay);
        }
      };

      if (result.newlyFinished.length > 0) {
        const names = result.newlyFinished
          .map((i) => result.players[i].name)
          .join("と");
        setMessage(`${names}が上がり！`);
        cpuTimeoutRef.current = setTimeout(afterDraw, 1200);
      } else {
        cpuTimeoutRef.current = setTimeout(afterDraw, 500);
      }
    }, 1000);
  };

  // Counter-clockwise: 0(bottom) → 1(right) → 2(top) → 3(left)

  return (
    <div className="h-screen flex flex-col relative overflow-hidden select-none">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={
          backgroundImage
            ? {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background:
                  "radial-gradient(ellipse at 50% 30%, #4a1a6b 0%, #2d1040 30%, #1a0a2e 60%, #0a0414 100%)",
              }
        }
      />
      {/* Stars (shown only when no background image) */}
      {!backgroundImage && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${1 + Math.random() * 2}px`,
                height: `${1 + Math.random() * 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 50}%`,
                opacity: 0.3 + Math.random() * 0.5,
                animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm">ババぬきしよう！</span>
        </div>
        <span className="text-[10px] text-white/40">{themeText}</span>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
        >
          退室
        </button>
      </div>

      {/* Game area */}
      <div className="relative z-10 flex-1 overflow-hidden">
        {/* Top - players[2]: 机の奥側 */}
        {players[2] && (
          <div className="absolute z-20" style={{ top: "2%", left: "50%", transform: "translateX(-50%)" }}>
            <OpponentCharacter
              player={players[2]}
              isCurrentTurn={currentTurnIndex === 2}
              isTarget={targetIndex === 2 && !players[currentTurnIndex].isCPU}
              onCardClick={
                targetIndex === 2 &&
                !players[currentTurnIndex].isCPU &&
                !isProcessing
                  ? handlePlayerDraw
                  : undefined
              }
              position="top"
            />
          </div>
        )}

        {/* Left - players[3]: 机の左側 */}
        {players[3] && (
          <div className="absolute z-20" style={{ top: "50%", left: "1%", transform: "translateY(-50%)" }}>
            <OpponentCharacter
              player={players[3]}
              isCurrentTurn={currentTurnIndex === 3}
              isTarget={targetIndex === 3 && !players[currentTurnIndex].isCPU}
              onCardClick={
                targetIndex === 3 &&
                !players[currentTurnIndex].isCPU &&
                !isProcessing
                  ? handlePlayerDraw
                  : undefined
              }
              position="left"
            />
          </div>
        )}

        {/* Right - players[1]: 机の右側 */}
        {players[1] && (
          <div className="absolute z-20" style={{ top: "50%", right: "1%", transform: "translateY(-50%)" }}>
            <OpponentCharacter
              player={players[1]}
              isCurrentTurn={currentTurnIndex === 1}
              isTarget={targetIndex === 1 && !players[currentTurnIndex].isCPU}
              onCardClick={
                targetIndex === 1 &&
                !players[currentTurnIndex].isCPU &&
                !isProcessing
                  ? handlePlayerDraw
                  : undefined
              }
              position="right"
            />
          </div>
        )}

        {/* Center - 丸机 */}
        <div
          className="absolute z-[15]"
          style={{
            left: "8%",
            right: "8%",
            top: "35%",
            bottom: "8%",
            borderRadius: "50%",
            background: "#D9C27A",
            boxShadow: "0 10px 0 #A8903A, 0 14px 30px rgba(0,0,0,0.5)",
          }}
        >
          {/* テーブル中央のコンテンツ */}
          <div className="absolute inset-0 flex items-center justify-center -translate-y-4">
            <div className="flex flex-col items-center gap-1.5">
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-xl text-xs font-bold text-center max-w-[200px] border border-white/10">
                {message}
              </div>

              {lastDrawnInfo && (
                <div className="bg-yellow-400/90 text-gray-900 px-2 py-0.5 rounded-lg text-xs font-bold shadow-lg animate-bounce">
                  {lastDrawnInfo}
                </div>
              )}

              <div className="w-10 h-10 rounded-full bg-amber-100/90 border-4 border-amber-800 flex items-center justify-center shadow-lg">
                <span className="text-lg">🕰</span>
              </div>

              <div className="flex gap-1 flex-wrap justify-center">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold
                      ${currentTurnIndex === players.indexOf(p)
                        ? "bg-yellow-400/80 text-gray-900"
                        : "bg-black/40 text-white/80"}`}
                  >
                    <PlayerAvatar src={p.avatar} name={p.name} size={10} />
                    <span>
                      {p.finishedOrder
                        ? `${p.finishedOrder}位`
                        : `${p.hand.length}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>{/* /table */}

        {/* Bottom - players[0]: プレイヤー手札のみ */}
        <div className="absolute z-20" style={{ bottom: "1%", left: "50%", transform: "translateX(-50%)" }}>
          {players[0].hand.length > 0 ? (
            <div className="flex gap-1 flex-nowrap justify-center max-w-[90vw] overflow-x-auto relative z-20">
              {players[0].hand.map((card) => (
                <CardFace
                  key={card.id}
                  card={card}
                  highlighted={highlightedRank != null && card.rank === highlightedRank}
                  large
                />
              ))}
              {drawnCardPreview && (
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <span className="text-[9px] text-yellow-300 font-bold">引いた！</span>
                  <CardFace
                    card={drawnCardPreview}
                    highlighted={highlightedRank === drawnCardPreview.rank}
                    large
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-green-400 font-bold text-lg py-4">
              &#x2714; 上がり!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

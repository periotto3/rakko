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

function CardFace({ card, highlighted }: { card: Card; highlighted?: boolean }) {
  const isJoker = card.suit === "joker";
  const color = SUIT_COLORS[card.suit];
  return (
    <div
      className={`relative w-[52px] h-[74px] rounded-lg shadow-lg flex flex-col items-center justify-center select-none shrink-0 transition-transform duration-200
        ${highlighted ? "border-2 border-yellow-400 ring-2 ring-yellow-300 scale-110 -translate-y-2" : "border border-gray-300"}`}
      style={{
        background: isJoker
          ? "linear-gradient(135deg, #faf5ff, #fce7f3)"
          : "linear-gradient(135deg, #ffffff, #f8f8f8)",
      }}
    >
      {isJoker ? (
        <>
          <span className="text-xl leading-none">💸</span>
          <span className="text-[7px] font-bold" style={{ color: "#7c3aed" }}>
            請求書
          </span>
        </>
      ) : (
        <>
          <span
            className="text-[8px] font-bold leading-none absolute top-0.5 left-1"
            style={{ color }}
          >
            {card.label}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt={card.label}
            width={26}
            height={26}
            className="object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "block";
            }}
          />
          <span className="text-xl leading-none hidden" style={{ color }}>
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
}: {
  onClick?: () => void;
  highlighted?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${small ? "w-[22px] h-[30px]" : "w-[52px] h-[74px]"} rounded-lg shadow-lg border-2 flex items-center justify-center select-none shrink-0 transition-transform duration-150
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
        <div className="w-[38px] h-[58px] rounded border border-white/20 flex items-center justify-center">
          <span className="text-white/60 text-lg">☁</span>
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
  const isVertical = position === "left" || position === "right";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative transition-all ${isCurrentTurn ? "scale-110" : ""}`}
      >
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2
            ${isCurrentTurn ? "border-yellow-400 bg-yellow-900/40 animate-pulse" : "border-white/30 bg-black/30"}`}
        >
          <PlayerAvatar src={player.avatar} name={player.name} size={48} />
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
            `残り ${player.hand.length}枚`
          )}
        </div>
      </div>

      {!finished && (
        isVertical ? (
          <div className="flex flex-col gap-0.5">
            {player.hand.map((_, i) => (
              <CardBack
                key={i}
                small
                highlighted={isTarget}
                onClick={isTarget && onCardClick ? () => onCardClick(i) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-row gap-0.5">
            {player.hand.map((_, i) => (
              <CardBack
                key={i}
                small
                highlighted={isTarget}
                onClick={isTarget && onCardClick ? () => onCardClick(i) : undefined}
              />
            ))}
          </div>
        )
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
        {/* Top - players[2] */}
        {players[2] && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
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

        {/* Left - players[3] */}
        {players[3] && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
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

        {/* Right - players[1] */}
        {players[1] && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
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

        {/* Center - table */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative w-[320px] rounded-[40px] border-4 border-yellow-900/60 shadow-2xl overflow-hidden pointer-events-auto"
            style={{
              height: "160px",
              background:
                "linear-gradient(180deg, #8B6914 0%, #A67C00 30%, #C4952A 50%, #A67C00 70%, #8B6914 100%)",
              boxShadow:
                "inset 0 2px 20px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* Wood grain lines */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-px bg-yellow-950/40"
                  style={{ top: `${12 + i * 12}%` }}
                />
              ))}
            </div>

            {/* Center content on table */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-xs font-bold text-center max-w-[280px] border border-white/10">
                  {message}
                </div>

                {lastDrawnInfo && (
                  <div className="bg-yellow-400/90 text-gray-900 px-3 py-1 rounded-lg text-xs font-bold shadow-lg animate-bounce">
                    {lastDrawnInfo}
                  </div>
                )}

                <div className="flex gap-3">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold
                        ${currentTurnIndex === players.indexOf(p)
                          ? "bg-yellow-400/80 text-gray-900"
                          : "bg-black/40 text-white/80"}`}
                    >
                      <PlayerAvatar src={p.avatar} name={p.name} size={14} />
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

            <div className="absolute bottom-3 left-4 text-2xl opacity-70">
              &#x1F4A3;
            </div>
            <div className="absolute bottom-3 right-4 text-2xl opacity-70">
              &#x231B;
            </div>
            <div className="absolute top-3 right-8 text-xl opacity-50">
              &#x2728;
            </div>
          </div>
        </div>

        {/* Bottom - players[0] */}
        <div className="absolute bottom-0 left-0 right-0 pb-4 px-4 z-10">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow
                ${currentTurnIndex === 0 ? "border-yellow-400 bg-yellow-900/30" : "border-white/20 bg-black/30"}`}
            >
              <PlayerAvatar src={players[0].avatar} name={players[0].name} size={48} />
            </div>
            <div className="text-white text-sm font-bold">
              {players[0].name}
            </div>
            <div className="text-white/60 text-xs">
              残り {players[0].hand.length}枚
            </div>
            {currentTurnIndex === 0 && (
              <span className="bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                YOUR TURN
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <PlayerHand player={players[0]} highlightedRank={highlightedRank} />
            {drawnCardPreview && (
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <span className="text-[9px] text-yellow-300 font-bold">引いた！</span>
                <CardFace card={drawnCardPreview} highlighted={highlightedRank === drawnCardPreview.rank} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

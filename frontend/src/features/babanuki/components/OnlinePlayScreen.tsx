"use client";

import { useState, useEffect } from "react";
import { Card } from "../lib/types";
import { JOKER_IMAGE_URL } from "../lib/constants";
import { BabanukiPlayer } from "../lib/types";
import type {
  GameService,
  GameStartData,
  CardDrawnData,
  RankingData,
  PublicPlayerData,
} from "../services/gameService";

interface OnlinePlayScreenProps {
  gameService: GameService;
  gameStartData: GameStartData;
  onGameEnd: (winner: BabanukiPlayer, players: BabanukiPlayer[], rankings: RankingData[]) => void;
}

const SUIT_SYMBOLS: Record<string, string> = {
  compute: "⚡", storage: "🪣", database: "🗄️", network: "🌐",
  frontend: "🖥️", management: "🛠️", joker: "💸",
};
const SUIT_COLORS: Record<string, string> = {
  compute: "#E07B39", storage: "#7AA116", database: "#2E73B8", network: "#8C4FFF",
  frontend: "#F59E42", management: "#6B7280", joker: "#7c3aed",
};

/* ─── Shared Card UI ─── */

function CardFace({ card, highlighted }: { card: Card; highlighted?: boolean }) {
  const isJoker = card.suit === "joker";
  const color = SUIT_COLORS[card.suit];
  return (
    <div
      className={`relative w-[52px] h-[74px] rounded-lg shadow-lg flex flex-col items-center justify-center select-none shrink-0 transition-transform duration-200
        ${highlighted ? "border-2 border-yellow-400 ring-2 ring-yellow-300 scale-110 -translate-y-2" : "border border-gray-300"}`}
      style={{ background: isJoker ? "linear-gradient(135deg, #faf5ff, #fce7f3)" : "linear-gradient(135deg, #ffffff, #f8f8f8)" }}
    >
      {isJoker ? (
        <>
          <span className="text-xl leading-none">💸</span>
          <span className="text-[7px] font-bold" style={{ color: "#7c3aed" }}>請求書</span>
        </>
      ) : (
        <>
          <span className="text-[8px] font-bold leading-none absolute top-0.5 left-1" style={{ color }}>{card.label}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.imageUrl} alt={card.label} width={26} height={26} className="object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "block";
            }}
          />
          <span className="text-xl leading-none hidden" style={{ color }}>{SUIT_SYMBOLS[card.suit]}</span>
        </>
      )}
    </div>
  );
}

function CardBack({ onClick, highlighted }: { onClick?: () => void; highlighted?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-[52px] h-[74px] rounded-lg shadow-lg border-2 flex items-center justify-center select-none shrink-0 transition-transform duration-150
        ${onClick ? "cursor-pointer hover:scale-110 hover:-translate-y-2" : "cursor-default"}
        ${highlighted ? "border-yellow-400 ring-2 ring-yellow-300" : "border-blue-900"}`}
      style={{ background: highlighted ? "linear-gradient(135deg, #1e40af, #3b82f6)" : "linear-gradient(135deg, #1e3a5f, #1e40af)" }}
    >
      <div className="w-[38px] h-[58px] rounded border border-white/20 flex items-center justify-center">
        <span className="text-white/60 text-lg">☁</span>
      </div>
    </button>
  );
}

/* ─── Online Opponent（cardCount のみ使用） ─── */

function OnlineOpponentCharacter({
  player,
  isCurrentTurn,
  isTarget,
  onCardClick,
}: {
  player: PublicPlayerData;
  isCurrentTurn: boolean;
  isTarget: boolean;
  onCardClick?: (index: number) => void;
}) {
  const finished = player.cardCount === 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative transition-all ${isCurrentTurn ? "scale-110" : ""}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg border-3
          ${isCurrentTurn ? "border-yellow-400 bg-yellow-900/40 animate-pulse" : "border-white/30 bg-black/30"}`}>
          {player.avatar}
        </div>
        {isCurrentTurn && !finished && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
            <span className="text-[8px] font-bold">&#x25B6;</span>
          </div>
        )}
      </div>
      <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center min-w-[90px] border border-white/10">
        <div className="text-white text-xs font-bold">{player.name}</div>
        <div className="text-[10px] text-gray-300">
          {finished ? <span className="text-green-400">✔ 上がり!</span> : `残り ${player.cardCount}枚`}
        </div>
      </div>
      {!finished && (
        <div className="flex gap-1 flex-wrap justify-center">
          {Array.from({ length: player.cardCount }).map((_, i) => (
            <CardBack
              key={i}
              highlighted={isTarget}
              onClick={isTarget && onCardClick ? () => onCardClick(i) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Player Hand ─── */

function PlayerHand({ hand, highlightedRank }: { hand: Card[]; highlightedRank?: number | null }) {
  if (hand.length === 0) {
    return <div className="text-center text-green-400 font-bold text-lg py-4">✔ 上がり!</div>;
  }
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {hand.map((card) => (
        <CardFace key={card.id} card={card} highlighted={highlightedRank != null && card.rank === highlightedRank} />
      ))}
    </div>
  );
}

/* ─── Utilities ─── */

function getNextActiveSeat(players: PublicPlayerData[], currentSeat: number): number {
  const count = players.length;
  for (let i = 1; i < count; i++) {
    const seat = (currentSeat + i) % count;
    if (players.find((p) => p.seatIndex === seat && p.cardCount > 0)) return seat;
  }
  return -1;
}

function rankingsToPlayers(rankings: RankingData[]): BabanukiPlayer[] {
  const loserRank = Math.max(...rankings.map((r) => r.rank));
  return rankings.map((r) => ({
    id: String(r.seatIndex),
    name: r.name,
    avatar: r.avatar,
    isCPU: false,
    hand: r.rank === loserRank
      ? [{ id: "joker", suit: "joker" as const, rank: 0, label: "請求書", imageUrl: JOKER_IMAGE_URL }]
      : [],
    finishedOrder: r.rank < loserRank ? r.rank : null,
  }));
}

/* ─── Main OnlinePlayScreen ─── */

export default function OnlinePlayScreen({ gameService, gameStartData, onGameEnd }: OnlinePlayScreenProps) {
  const mySeatIndex = gameStartData.yourSeatIndex;

  const [yourHand, setYourHand] = useState<Card[]>(gameStartData.yourHand);
  const [players, setPlayers] = useState<PublicPlayerData[]>(gameStartData.players);
  const [currentTurnSeat, setCurrentTurnSeat] = useState(gameStartData.currentTurnSeat);
  const [message, setMessage] = useState(
    gameStartData.currentTurnSeat === mySeatIndex
      ? "あなたのターンです。相手のカードをクリックして引いてください！"
      : `${gameStartData.players.find((p) => p.seatIndex === gameStartData.currentTurnSeat)?.name ?? "?"}のターン...`
  );
  const [lastDrawnInfo, setLastDrawnInfo] = useState<string | null>(null);

  useEffect(() => {
    gameService.onGameState((data) => {
      setYourHand(data.yourHand);
      setPlayers(data.players);
      setCurrentTurnSeat(data.currentTurnSeat);
      const turnPlayer = data.players.find((p) => p.seatIndex === data.currentTurnSeat);
      setMessage(
        data.currentTurnSeat === mySeatIndex
          ? "あなたのターンです。相手のカードをクリックして引いてください！"
          : `${turnPlayer?.name ?? "?"}のターン...`
      );
    });

    gameService.onCardDrawn((data: CardDrawnData) => {
      // stale closure 回避のため functional setState で最新プレイヤー情報を参照
      setPlayers((prev) => {
        const drawer = prev.find((p) => p.seatIndex === data.drawerSeat);
        setLastDrawnInfo(
          data.drawerSeat === mySeatIndex && data.paired
            ? "ペアを捨てた！"
            : data.paired
              ? `${drawer?.name ?? "?"}がペアを捨てた！`
              : `${drawer?.name ?? "?"}がカードを引いた`
        );
        return prev;
      });
    });

    gameService.onGameOver((rankings) => {
      const converted = rankingsToPlayers(rankings);
      const winner = converted.find((p) => p.finishedOrder === 1) ?? converted[0];
      onGameEnd(winner, converted, rankings);
    });

    gameService.onError((msg) => {
      setMessage(`エラー: ${msg}`);
    });
  }, [gameService]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMyTurn = currentTurnSeat === mySeatIndex;
  const targetSeat = isMyTurn ? getNextActiveSeat(players, mySeatIndex) : -1;

  const handleCardClick = (cardIndex: number) => {
    if (!isMyTurn) return;
    gameService.drawCard(cardIndex);
  };

  // mySeat からの相対位置: right=(+1), top=(+2), left=(+3)
  const rightSeat = (mySeatIndex + 1) % 4;
  const topSeat = (mySeatIndex + 2) % 4;
  const leftSeat = (mySeatIndex + 3) % 4;

  const getPlayer = (seat: number) => players.find((p) => p.seatIndex === seat);
  const myPlayer = getPlayer(mySeatIndex);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden select-none">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, #4a1a6b 0%, #2d1040 30%, #1a0a2e 60%, #0a0414 100%)" }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/10">
        <span className="text-white font-bold text-sm">ババぬきしよう！</span>
        <span className="text-[10px] text-white/40">オンライン対戦</span>
        <button onClick={() => window.location.reload()} className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">退室</button>
      </div>

      {/* Game area */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Opponents row */}
        <div className="flex justify-around items-start px-4 pt-3 pb-1">
          {[leftSeat, topSeat, rightSeat].map((seat) => {
            const p = getPlayer(seat);
            if (!p) return null;
            return (
              <OnlineOpponentCharacter
                key={seat}
                player={p}
                isCurrentTurn={currentTurnSeat === seat}
                isTarget={targetSeat === seat}
                onCardClick={targetSeat === seat ? handleCardClick : undefined}
              />
            );
          })}
        </div>

        {/* Table */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div
            className="relative w-full max-w-2xl rounded-[40px] border-4 border-yellow-900/60 shadow-2xl overflow-hidden"
            style={{ height: "180px", background: "linear-gradient(180deg, #8B6914 0%, #A67C00 30%, #C4952A 50%, #A67C00 70%, #8B6914 100%)", boxShadow: "inset 0 2px 20px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5)" }}
          >
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
                    <div key={p.seatIndex} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold
                      ${currentTurnSeat === p.seatIndex ? "bg-yellow-400/80 text-gray-900" : "bg-black/40 text-white/80"}`}>
                      <span>{p.avatar}</span>
                      <span>{p.finishedOrder ? `${p.finishedOrder}位` : `${p.cardCount}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player hand */}
        <div className="pb-4 px-4">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 shadow
              ${isMyTurn ? "border-yellow-400 bg-yellow-900/30" : "border-white/20 bg-black/30"}`}>
              {myPlayer?.avatar ?? "😊"}
            </div>
            <div className="text-white text-sm font-bold">{myPlayer?.name ?? "あなた"}</div>
            <div className="text-white/60 text-xs">残り {yourHand.length}枚</div>
            {isMyTurn && (
              <span className="bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                YOUR TURN
              </span>
            )}
          </div>
          <PlayerHand hand={yourHand} />
        </div>
      </div>
    </div>
  );
}

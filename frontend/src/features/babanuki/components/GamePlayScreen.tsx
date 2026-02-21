"use client";

import { useState, useEffect } from "react";
import { Card } from "../lib/types";
import { BabanukiPlayer } from "../lib/types";
import { JOKER_IMAGE_URL } from "../lib/constants";
import PlayerAvatar from "./PlayerAvatar";
import type {
  GameService,
  GameStartData,
  CardDrawnData,
  RankingData,
  PublicPlayerData,
} from "../services/gameService";

interface GamePlayScreenProps {
  gameService: GameService;
  gameStartData: GameStartData;
  backgroundImage?: string;
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

/* ─── Card Components ─── */

function CardFace({ card, highlighted, large }: { card: Card; highlighted?: boolean; large?: boolean }) {
  const isJoker = card.suit === "joker";
  const color = SUIT_COLORS[card.suit];
  return (
    <div
      className={`relative ${large ? "w-[78px] h-[111px]" : "w-[52px] h-[74px]"} rounded-lg shadow-lg flex flex-col items-center justify-center select-none shrink-0 transition-transform duration-200
        ${highlighted ? "border-2 border-yellow-400 ring-2 ring-yellow-300 scale-110 -translate-y-2" : "border border-gray-300"}`}
      style={{ background: isJoker ? "linear-gradient(135deg, #faf5ff, #fce7f3)" : "linear-gradient(135deg, #ffffff, #f8f8f8)" }}
    >
      {isJoker ? (
        <>
          <span className={`${large ? "text-3xl" : "text-xl"} leading-none`}>💸</span>
          <span className={`${large ? "text-[10px]" : "text-[7px]"} font-bold`} style={{ color: "#7c3aed" }}>請求書</span>
        </>
      ) : (
        <>
          <span className={`${large ? "text-[12px]" : "text-[8px]"} font-bold leading-none absolute top-0.5 left-1`} style={{ color }}>
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
  onClick, highlighted, large, compact,
}: {
  onClick?: () => void;
  highlighted?: boolean;
  large?: boolean;
  compact?: boolean;
}) {
  const sizeClass = large ? "w-[78px] h-[111px]" : compact ? "w-[38px] h-[54px]" : "w-[52px] h-[74px]";
  const innerClass = large ? "w-[58px] h-[90px]" : compact ? "w-[28px] h-[42px]" : "w-[38px] h-[58px]";
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${sizeClass} rounded-lg shadow-lg border-2 flex items-center justify-center select-none shrink-0 transition-transform duration-150
        ${onClick ? "cursor-pointer hover:scale-110 hover:-translate-y-1" : "cursor-default"}
        ${highlighted ? "border-yellow-400 ring-2 ring-yellow-300" : "border-blue-900"}`}
      style={{ background: highlighted ? "linear-gradient(135deg, #1e40af, #3b82f6)" : "linear-gradient(135deg, #1e3a5f, #1e40af)" }}
    >
      <div className={`${innerClass} rounded border border-white/20 flex items-center justify-center`}>
        <span className={`text-white/60 ${large ? "text-xl" : compact ? "text-xs" : "text-lg"}`}>☁</span>
      </div>
    </button>
  );
}

/* ─── Opponent Panel ─── */

function OpponentPanel({
  player, isCurrentTurn, isTarget, onCardClick,
}: {
  player: PublicPlayerData;
  isCurrentTurn: boolean;
  isTarget: boolean;
  onCardClick?: (index: number) => void;
}) {
  const finished = player.cardCount === 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <div className={`relative transition-all ${isCurrentTurn ? "scale-110" : ""}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-2
            ${isCurrentTurn ? "border-yellow-400 bg-yellow-900/40 animate-pulse" : "border-white/30 bg-black/30"}`}>
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
            {finished ? <span className="text-green-400">&#x2714; 上がり!</span> : `${player.cardCount}枚`}
          </div>
        </div>
      </div>
      {!finished && (
        <div className="flex gap-1 flex-wrap justify-center relative z-20">
          {Array.from({ length: player.cardCount }).map((_, idx) => (
            <CardBack
              key={idx}
              onClick={isTarget && onCardClick ? () => onCardClick(idx) : undefined}
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

/* ─── Utilities ─── */

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

/* ─── Main GamePlayScreen ─── */

export default function GamePlayScreen({ gameService, gameStartData, backgroundImage, onGameEnd }: GamePlayScreenProps) {
  const mySeatIndex = gameStartData.yourSeatIndex;

  const [yourHand, setYourHand] = useState<Card[]>(gameStartData.yourHand);
  const [players, setPlayers] = useState<PublicPlayerData[]>(gameStartData.players);
  const [currentTurnSeat, setCurrentTurnSeat] = useState(gameStartData.currentTurnSeat);
  const [message, setMessage] = useState(
    gameStartData.currentTurnSeat === mySeatIndex
      ? "あなたのターンです。相手のカードをクリックして引いてください！"
      : `${gameStartData.players.find(p => p.seatIndex === gameStartData.currentTurnSeat)?.name ?? "?"}のターン...`
  );
  const [lastDrawnInfo, setLastDrawnInfo] = useState<string | null>(null);

  useEffect(() => {
    gameService.onGameState((data) => {
      setYourHand(data.yourHand);
      setPlayers(data.players);
      setCurrentTurnSeat(data.currentTurnSeat);
      const turnPlayer = data.players.find(p => p.seatIndex === data.currentTurnSeat);
      setMessage(
        data.currentTurnSeat === mySeatIndex
          ? "あなたのターンです。相手のカードをクリックして引いてください！"
          : `${turnPlayer?.name ?? "?"}のターン...`
      );
    });

    gameService.onCardDrawn((data: CardDrawnData) => {
      setPlayers((prev) => {
        const drawer = prev.find(p => p.seatIndex === data.drawerSeat);
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
      const winner = converted.find(p => p.finishedOrder === 1) ?? converted[0];
      onGameEnd(winner, converted, rankings);
    });

    gameService.onError((msg) => {
      setMessage(`エラー: ${msg}`);
    });
  }, [gameService]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMyTurn = currentTurnSeat === mySeatIndex;

  const getNextActiveSeat = (currentSeat: number): number => {
    for (let i = 1; i < players.length; i++) {
      const seat = (currentSeat + i) % players.length;
      if (players.find(p => p.seatIndex === seat && p.cardCount > 0)) return seat;
    }
    return -1;
  };

  const targetSeat = isMyTurn ? getNextActiveSeat(mySeatIndex) : -1;

  const handleCardClick = (cardIndex: number) => {
    if (!isMyTurn) return;
    gameService.drawCard(cardIndex);
  };

  // seat layout relative to mySeat: right=(+1), top=(+2), left=(+3)
  const rightSeat = (mySeatIndex + 1) % 4;
  const topSeat   = (mySeatIndex + 2) % 4;
  const leftSeat  = (mySeatIndex + 3) % 4;

  const getPlayer = (seat: number) => players.find(p => p.seatIndex === seat);
  const myPlayer = getPlayer(mySeatIndex);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden select-none">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={
          backgroundImage
            ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: "radial-gradient(ellipse at 50% 30%, #4a1a6b 0%, #2d1040 30%, #1a0a2e 60%, #0a0414 100%)" }
        }
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/10">
        <span className="text-white font-bold text-sm">ババぬきしよう！</span>
        <span className="text-[10px] text-white/40">{backgroundImage ? "CPUモード" : "オンライン対戦"}</span>
        <button onClick={() => window.location.reload()} className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">退室</button>
      </div>

      {/* Game area */}
      <div className="relative z-10 flex-1 overflow-hidden">
        {/* Top */}
        {getPlayer(topSeat) && (
          <div className="absolute z-20" style={{ top: "2%", left: "50%", transform: "translateX(-50%)" }}>
            <OpponentPanel
              player={getPlayer(topSeat)!}
              isCurrentTurn={currentTurnSeat === topSeat}
              isTarget={targetSeat === topSeat}
              onCardClick={targetSeat === topSeat ? handleCardClick : undefined}
            />
          </div>
        )}

        {/* Left */}
        {getPlayer(leftSeat) && (
          <div className="absolute z-20" style={{ top: "50%", left: "1%", transform: "translateY(-50%)" }}>
            <OpponentPanel
              player={getPlayer(leftSeat)!}
              isCurrentTurn={currentTurnSeat === leftSeat}
              isTarget={targetSeat === leftSeat}
              onCardClick={targetSeat === leftSeat ? handleCardClick : undefined}
            />
          </div>
        )}

        {/* Right */}
        {getPlayer(rightSeat) && (
          <div className="absolute z-20" style={{ top: "50%", right: "1%", transform: "translateY(-50%)" }}>
            <OpponentPanel
              player={getPlayer(rightSeat)!}
              isCurrentTurn={currentTurnSeat === rightSeat}
              isTarget={targetSeat === rightSeat}
              onCardClick={targetSeat === rightSeat ? handleCardClick : undefined}
            />
          </div>
        )}

        {/* Center - 丸机 */}
        <div
          className="absolute z-[15]"
          style={{
            left: "8%", right: "8%", top: "35%", bottom: "8%",
            borderRadius: "50%",
            background: "#D9C27A",
            boxShadow: "0 10px 0 #A8903A, 0 14px 30px rgba(0,0,0,0.5)",
          }}
        >
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
                    key={p.seatIndex}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold
                      ${currentTurnSeat === p.seatIndex ? "bg-yellow-400/80 text-gray-900" : "bg-black/40 text-white/80"}`}
                  >
                    <PlayerAvatar src={p.avatar} name={p.name} size={10} />
                    <span>
                      {p.finishedOrder
                        ? `${p.finishedOrder}位`
                        : `${p.seatIndex === mySeatIndex ? yourHand.length : p.cardCount}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom - my hand */}
        <div className="absolute z-20" style={{ bottom: "1%", left: "50%", transform: "translateX(-50%)" }}>
          {isMyTurn && (
            <div className="text-center mb-1">
              <span className="bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                YOUR TURN
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow
              ${isMyTurn ? "border-yellow-400 bg-yellow-900/30" : "border-white/20 bg-black/30"}`}>
              <PlayerAvatar src={myPlayer?.avatar ?? ""} name={myPlayer?.name ?? "あなた"} size={32} />
            </div>
            <div className="text-white text-sm font-bold">{myPlayer?.name ?? "あなた"}</div>
          </div>
          {yourHand.length > 0 ? (
            <div className="flex gap-1 flex-nowrap justify-center max-w-[90vw] overflow-x-auto">
              {yourHand.map((card) => (
                <CardFace key={card.id} card={card} large />
              ))}
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

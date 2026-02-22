import {
  drawCard,
  cpuChooseCard,
  getDrawTarget,
  getNextActivePlayer,
  isGameOver,
  dealCards,
  THEME_WHO,
  THEME_WHEN,
  THEME_WHERE,
  THEME_WHAT,
} from "../lib/engine";
import { BabanukiPlayer } from "../lib/types";
import {
  GameService,
  GameStartData,
  GameStateData,
  CardDrawnData,
  RankingData,
  PublicPlayerData,
  RouletteSlotData,
} from "./gameService";

const CPU_PLAYERS = [
  { id: "cpu1", name: "Aさん", avatar: "/avatars/cpu_1.png" },
  { id: "cpu2", name: "Bさん", avatar: "/avatars/cpu_2.png" },
  { id: "cpu3", name: "Cさん", avatar: "/avatars/cpu_3.png" },
];

const JOIN_DELAYS = [500, 3000, 5500, 8000];

const SLOT_SEQUENCE: Array<{ key: RouletteSlotData["key"]; items: string[] }> = [
  { key: "who",   items: THEME_WHO },
  { key: "when",  items: THEME_WHEN },
  { key: "where", items: THEME_WHERE },
  { key: "what",  items: THEME_WHAT },
];

/**
 * CPU（オフライン）モードの GameService 実装。
 * engine.ts のゲームロジックをラップし、GameService インターフェースを提供する。
 */
export class CpuGameService implements GameService {
  private players: BabanukiPlayer[] = [];
  private pendingPlayers: BabanukiPlayer[] | undefined;
  private currentTurnIndex = 0;
  private targetIndex = 0;
  private finishedCount = 0;
  private readonly mySeatIndex = 0; // human は常に seat 0
  private timers: ReturnType<typeof setTimeout>[] = [];
  private isRunning = false;

  private waitingCb?: (waitingCount: number) => void;
  private waitingPlayersCb?: (players: BabanukiPlayer[]) => void;
  private waitingSlotCb?: (slot: RouletteSlotData, allSlots: RouletteSlotData[]) => void;
  private gameStartCb?: (data: GameStartData) => void;
  private gameStateCb?: (data: GameStateData) => void;
  private cardDrawnCb?: (data: CardDrawnData) => void;
  private gameOverCb?: (rankings: RankingData[]) => void;
  private errorCb?: (message: string) => void;

  onWaiting(cb: (waitingCount: number) => void): void { this.waitingCb = cb; }
  onWaitingPlayers(cb: (players: BabanukiPlayer[]) => void): void { this.waitingPlayersCb = cb; }
  onWaitingSlot(cb: (slot: RouletteSlotData, allSlots: RouletteSlotData[]) => void): void { this.waitingSlotCb = cb; }
  onGameStart(cb: (data: GameStartData) => void): void { this.gameStartCb = cb; }
  onGameState(cb: (data: GameStateData) => void): void { this.gameStateCb = cb; }
  onCardDrawn(cb: (data: CardDrawnData) => void): void { this.cardDrawnCb = cb; }
  onGameOver(cb: (rankings: RankingData[]) => void): void { this.gameOverCb = cb; }
  onGenerating(_cb: () => void): void { /* CPUモードでは画像生成なし */ }
  onImagesReady(_cb: (imageUrls: string[]) => void): void { /* CPUモードでは画像生成なし */ }
  onError(cb: (message: string) => void): void { this.errorCb = cb; }

  join(playerName: string): void {
    const allPlayers: BabanukiPlayer[] = [
      { id: "human", name: playerName, avatar: "/avatars/user.png", isCPU: false, hand: [], finishedOrder: null },
      ...CPU_PLAYERS.map((c) => ({ ...c, isCPU: true, hand: [], finishedOrder: null })),
    ];
    this.pendingPlayers = allPlayers;

    const decidedSlots: RouletteSlotData[] = [];

    allPlayers.forEach((_, i) => {
      const timer = setTimeout(() => {
        this.waitingCb?.(i + 1);
        this.waitingPlayersCb?.(allPlayers.slice(0, i + 1));

        const { key, items } = SLOT_SEQUENCE[i];
        const value = items[Math.floor(Math.random() * items.length)];
        const slot: RouletteSlotData = { key, value, slotIndex: i };
        decidedSlots.push(slot);
        this.waitingSlotCb?.(slot, [...decidedSlots]);
      }, JOIN_DELAYS[i]);
      this.timers.push(timer);
    });
  }

  startGame(): void {
    if (!this.pendingPlayers) return;
    this.players = dealCards(this.pendingPlayers);
    this.pendingPlayers = undefined;
    this.currentTurnIndex = 0;
    this.targetIndex = getDrawTarget(this.players, 0);
    this.finishedCount = 0;
    this.isRunning = true;

    this.gameStartCb?.({
      yourSeatIndex: this.mySeatIndex,
      yourHand: [...this.players[this.mySeatIndex].hand],
      players: this.buildPublicPlayers(),
      currentTurnSeat: this.currentTurnIndex,
    });

    if (this.players[this.currentTurnIndex].isCPU) {
      this.scheduleCpuTurn();
    }
  }

  drawCard(cardIndex: number): void {
    if (!this.isRunning) return;
    if (this.players[this.currentTurnIndex]?.isCPU) {
      this.errorCb?.("Not your turn");
      return;
    }
    const targetHand = this.players[this.targetIndex]?.hand;
    if (!targetHand || cardIndex >= targetHand.length) {
      this.errorCb?.(`Invalid card index`);
      return;
    }
    this.processDrawCard(this.currentTurnIndex, this.targetIndex, cardIndex);
  }

  dispose(): void {
    this.isRunning = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private processDrawCard(drawerIndex: number, targetIndex: number, cardIndex: number): void {
    const drawerHandLengthBefore = this.players[drawerIndex].hand.length;

    const result = drawCard(this.players, drawerIndex, targetIndex, cardIndex, this.finishedCount);
    const paired = result.players[drawerIndex].hand.length < drawerHandLengthBefore;

    // card_drawn を先に通知（アニメーション用）
    this.cardDrawnCb?.({ drawerSeat: drawerIndex, targetSeat: targetIndex, paired });

    this.players = result.players;
    this.finishedCount = result.finishedCount;

    const afterDraw = () => {
      if (isGameOver(this.players)) {
        // 残プレイヤーにランク付与: 手札少ない順、Joker持ちは最後
        const remaining = this.players.filter(p => p.hand.length > 0 && p.finishedOrder === null);
        remaining.sort((a, b) => {
          const aJoker = a.hand.some(c => c.suit === "joker");
          const bJoker = b.hand.some(c => c.suit === "joker");
          if (aJoker !== bJoker) return aJoker ? 1 : -1;
          return a.hand.length - b.hand.length;
        });
        let nextRank = this.finishedCount + 1;
        const rankMap = new Map(remaining.map(p => [p.id, nextRank++]));
        this.players = this.players.map(p =>
          rankMap.has(p.id) ? { ...p, finishedOrder: rankMap.get(p.id)! } : p
        );
        this.isRunning = false;
        this.gameOverCb?.(this.buildRankings());
        return;
      }

      const next = getNextActivePlayer(this.players, drawerIndex);
      const nextTarget = getDrawTarget(this.players, next);
      this.currentTurnIndex = next;
      this.targetIndex = nextTarget;

      // game_state 通知
      this.gameStateCb?.({
        yourHand: [...this.players[this.mySeatIndex].hand],
        players: this.buildPublicPlayers(),
        currentTurnSeat: this.currentTurnIndex,
      });

      if (this.players[next].isCPU) {
        this.scheduleCpuTurn();
      }
    };

    // 上がりが出た場合は少し間を置いてから状態遷移
    const delay = result.newlyFinished.length > 0 ? 1000 : 0;
    const timer = setTimeout(afterDraw, delay);
    this.timers.push(timer);
  }

  private scheduleCpuTurn(): void {
    const delay = 800 + Math.random() * 700;
    const timer = setTimeout(() => {
      if (!this.isRunning) return;
      const turnIndex = this.currentTurnIndex;
      const turnTarget = this.targetIndex;
      if (turnTarget === -1 || !this.players[turnTarget] || this.players[turnTarget].hand.length === 0) return;
      const cardIdx = cpuChooseCard(this.players[turnTarget].hand.length);
      this.processDrawCard(turnIndex, turnTarget, cardIdx);
    }, delay);
    this.timers.push(timer);
  }

  private buildPublicPlayers(): PublicPlayerData[] {
    return this.players.map((p, i) => ({
      seatIndex: i,
      name: p.name,
      avatar: p.avatar,
      cardCount: p.hand.length,
      finishedOrder: p.finishedOrder,
    }));
  }

  private buildRankings(): RankingData[] {
    return this.players.map((p, i) => ({
      seatIndex: i,
      name: p.name,
      avatar: p.avatar,
      rank: p.finishedOrder ?? this.players.length,
    }));
  }
}

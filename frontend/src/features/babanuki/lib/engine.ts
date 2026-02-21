import { Card, Suit, BabanukiPlayer, BabanukiState, ThemeSlot } from "./types";
import { AWS_SERVICES, JOKER_IMAGE_URL } from "./constants";

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const svc of AWS_SERVICES) {
    for (const copy of ["a", "b", "c", "d"]) {
      cards.push({ id: `${svc.rank}-${copy}`, suit: svc.suit, rank: svc.rank, label: svc.label, imageUrl: svc.imageUrl });
    }
  }
  cards.push({ id: "joker", suit: "joker", rank: 0, label: "請求書", imageUrl: JOKER_IMAGE_URL });
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function removePairs(hand: Card[]): Card[] {
  const byRank = new Map<number, Card[]>();
  for (const card of hand) {
    const existing = byRank.get(card.rank) || [];
    existing.push(card);
    byRank.set(card.rank, existing);
  }
  const remaining: Card[] = [];
  for (const [, cards] of byRank) {
    if (cards.length % 2 === 1) {
      remaining.push(cards[0]);
    }
  }
  return shuffle(remaining);
}

export function dealCards(players: BabanukiPlayer[]): BabanukiPlayer[] {
  const deck = shuffle(createDeck());
  const updated = players.map((p) => ({ ...p, hand: [] as Card[] }));
  for (let i = 0; i < deck.length; i++) {
    updated[i % updated.length].hand.push(deck[i]);
  }
  return updated.map((p) => ({ ...p, hand: removePairs(p.hand) }));
}

export function getNextActivePlayer(
  players: BabanukiPlayer[],
  currentIndex: number
): number {
  let next = (currentIndex + 1) % players.length;
  while (players[next].hand.length === 0) {
    if (next === currentIndex) return -1;
    next = (next + 1) % players.length;
  }
  return next;
}

export function getDrawTarget(
  players: BabanukiPlayer[],
  currentIndex: number
): number {
  let target = (currentIndex + 1) % players.length;
  while (players[target].hand.length === 0) {
    target = (target + 1) % players.length;
    if (target === currentIndex) return -1;
  }
  return target;
}

export function drawCard(
  players: BabanukiPlayer[],
  drawerIndex: number,
  targetIndex: number,
  cardIndex: number,
  finishedCount: number
): { players: BabanukiPlayer[]; finishedCount: number; newlyFinished: number[] } {
  const updated = players.map((p) => ({
    ...p,
    hand: [...p.hand],
  }));

  const targetHand = updated[targetIndex].hand;
  const [drawnCard] = targetHand.splice(cardIndex, 1);

  const drawerHand = updated[drawerIndex].hand;
  const pairIndex = drawerHand.findIndex(
    (c) => c.rank === drawnCard.rank && c.id !== drawnCard.id
  );

  if (pairIndex !== -1) {
    drawerHand.splice(pairIndex, 1);
  } else {
    drawerHand.push(drawnCard);
    updated[drawerIndex].hand = shuffle(drawerHand);
  }

  let count = finishedCount;
  const newlyFinished: number[] = [];

  if (updated[targetIndex].hand.length === 0 && updated[targetIndex].finishedOrder === null) {
    count++;
    updated[targetIndex].finishedOrder = count;
    newlyFinished.push(targetIndex);
  }

  if (updated[drawerIndex].hand.length === 0 && updated[drawerIndex].finishedOrder === null) {
    count++;
    updated[drawerIndex].finishedOrder = count;
    newlyFinished.push(drawerIndex);
  }

  return { players: updated, finishedCount: count, newlyFinished };
}

export function cpuChooseCard(targetHandLength: number): number {
  return Math.floor(Math.random() * targetHandLength);
}

export function getActivePlayers(players: BabanukiPlayer[]): number {
  return players.filter((p) => p.hand.length > 0).length;
}

export function isGameOver(players: BabanukiPlayer[]): boolean {
  return players.some((p) => p.finishedOrder !== null);
}

export function getWinner(players: BabanukiPlayer[]): BabanukiPlayer {
  return players.find((p) => p.finishedOrder === 1)!;
}

export function getLoser(players: BabanukiPlayer[]): BabanukiPlayer | null {
  return players.find((p) => p.hand.length > 0) || null;
}

export function createInitialState(): BabanukiState {
  return {
    phase: "title",
    players: [],
    currentTurnIndex: 0,
    targetPlayerIndex: 0,
    theme: null,
    finishedCount: 0,
    winner: null,
    generationProgress: 0,
  };
}

const CPU_PLAYERS = [
  { id: "cpu1", name: "Aさん", avatar: "🐱" },
  { id: "cpu2", name: "Bさん", avatar: "🐶" },
  { id: "cpu3", name: "Cさん", avatar: "🐰" },
];

export function createPlayers(playerCount: number): BabanukiPlayer[] {
  const human: BabanukiPlayer = {
    id: "human",
    name: "あなた",
    isCPU: false,
    hand: [],
    finishedOrder: null,
    avatar: "😊",
  };
  const cpus = CPU_PLAYERS.slice(0, playerCount - 1).map((c) => ({
    ...c,
    isCPU: true,
    hand: [] as Card[],
    finishedOrder: null,
  }));
  return [human, ...cpus];
}

// Theme roulette data
const THEME_WHO = ["Aさんが", "Bさんが", "Cさんが", "みんなで", "あなたが"];
const THEME_WHEN = ["社会人のとき", "子供のとき", "夏休みに", "深夜に", "朝一で"];
const THEME_WHERE = ["家で", "学校で", "海辺で", "宇宙で", "森の中で"];
const THEME_WHAT = ["さみしかった話", "笑った話", "驚いた話", "冒険した話", "食べた話"];

export function spinRoulette(): ThemeSlot {
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  return {
    who: pick(THEME_WHO),
    when: pick(THEME_WHEN),
    where: pick(THEME_WHERE),
    what: pick(THEME_WHAT),
  };
}

export { THEME_WHO, THEME_WHEN, THEME_WHERE, THEME_WHAT };

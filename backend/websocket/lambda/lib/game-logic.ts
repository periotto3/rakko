import { Card, Suit, Player } from "./types";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const RANK_LABELS: Record<number, string> = {
  1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
  8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K",
};

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        label: RANK_LABELS[rank],
      });
    }
  }
  cards.push({ id: "joker", suit: "joker", rank: 0, label: "JOKER" });
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
    const existing = byRank.get(card.rank) ?? [];
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

export function dealCards(players: Player[]): Player[] {
  const deck = shuffle(createDeck());
  const updated = players.map((p) => ({ ...p, hand: [] as Card[] }));
  for (let i = 0; i < deck.length; i++) {
    updated[i % updated.length].hand.push(deck[i]);
  }
  return updated.map((p) => ({ ...p, hand: removePairs(p.hand) }));
}

export function getNextActivePlayer(
  players: Player[],
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
  players: Player[],
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
  players: Player[],
  drawerIndex: number,
  targetIndex: number,
  cardIndex: number,
  finishedCount: number
): { players: Player[]; finishedCount: number; paired: boolean; newlyFinished: number[] } {
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

  const paired = pairIndex !== -1;

  if (paired) {
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

  return { players: updated, finishedCount: count, paired, newlyFinished };
}

export function getActivePlayers(players: Player[]): number {
  return players.filter((p) => p.hand.length > 0).length;
}

export function isGameOver(players: Player[]): boolean {
  return players.some(p => p.finishedOrder !== null);
}

export function getRankings(players: Player[]): { seatIndex: number; name: string; avatar: string; rank: number }[] {
  const sorted = [...players].sort((a, b) => {
    // Players with finishedOrder come first (lower = better)
    if (a.finishedOrder !== null && b.finishedOrder !== null) {
      return a.finishedOrder - b.finishedOrder;
    }
    if (a.finishedOrder !== null) return -1;
    if (b.finishedOrder !== null) return 1;
    // Player still holding cards is last (the loser)
    return a.hand.length - b.hand.length;
  });

  return sorted.map((p, i) => ({
    seatIndex: p.seatIndex,
    name: p.name,
    avatar: p.avatar,
    rank: i + 1,
  }));
}

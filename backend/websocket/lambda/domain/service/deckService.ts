import { Card, Suit } from "../model/card/card.js";
import { Player } from "../model/player/player.js";

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const RANK_LABELS: Record<number, string> = {
  1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
  8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K",
};

const DECK_RANK_COUNT = 6;

export function createDeck(): Card[] {
  const allRanks = Array.from({ length: 13 }, (_, i) => i + 1);
  const selectedRanks = shuffle(allRanks).slice(0, DECK_RANK_COUNT);

  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of selectedRanks) {
      cards.push(new Card(`${suit}-${rank}`, suit, rank, RANK_LABELS[rank]));
    }
  }
  cards.push(new Card("joker", "joker", 0, "JOKER"));
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
  const hands: Card[][] = players.map(() => []);
  for (let i = 0; i < deck.length; i++) {
    hands[i % players.length].push(deck[i]);
  }
  return players.map((p, i) =>
    new Player(p.connectionId, p.name, p.avatar, p.seatIndex, removePairs(hands[i]), p.finishedOrder)
  );
}

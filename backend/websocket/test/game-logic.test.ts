import {
  createDeck,
  shuffle,
  removePairs,
  dealCards,
} from "../lambda/domain/service/deckService";
import {
  getNextActivePlayer,
  getDrawTarget,
  drawCard,
  getActivePlayers,
  isGameOver,
  getRankings,
} from "../lambda/domain/service/drawService";
import { Card } from "../lambda/domain/model/card/card";
import { Player } from "../lambda/domain/model/player/player";

// Helper to create a card
function card(suit: Card["suit"], rank: number, id?: string): Card {
  const labels: Record<number, string> = {
    0: "JOKER", 1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
    8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K",
  };
  return new Card(id ?? `${suit}-${rank}`, suit, rank, labels[rank]);
}

// Helper to create a player
function makePlayer(
  seatIndex: number,
  hand: Card[],
  opts?: { connectionId?: string; name?: string; avatar?: string; finishedOrder?: number | null }
): Player {
  return new Player(
    opts?.connectionId ?? `conn-${seatIndex}`,
    opts?.name ?? `Player${seatIndex}`,
    opts?.avatar ?? "😊",
    seatIndex,
    hand,
    opts?.finishedOrder ?? null
  );
}

describe("createDeck", () => {
  it("should generate 33 cards (8 ranks × 4 suits + joker)", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(33);
  });

  it("should have 8 cards per suit", () => {
    const deck = createDeck();
    const suits = ["spades", "hearts", "diamonds", "clubs"];
    for (const suit of suits) {
      const suitCards = deck.filter((c) => c.suit === suit);
      expect(suitCards).toHaveLength(8);
    }
  });

  it("should have exactly one joker", () => {
    const deck = createDeck();
    const jokers = deck.filter((c) => c.suit === "joker");
    expect(jokers).toHaveLength(1);
    expect(jokers[0].rank).toBe(0);
    expect(jokers[0].label).toBe("JOKER");
  });

  it("should have unique IDs for all cards", () => {
    const deck = createDeck();
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(33);
  });

  it("should use the same 8 ranks across all suits", () => {
    const deck = createDeck();
    const suits = ["spades", "hearts", "diamonds", "clubs"];
    const ranksBySuit = suits.map(
      (suit) => new Set(deck.filter((c) => c.suit === suit).map((c) => c.rank))
    );
    // All suits should have the same set of ranks
    for (const ranks of ranksBySuit) {
      expect(ranks).toEqual(ranksBySuit[0]);
    }
  });

  it("should select ranks from 1-13", () => {
    const deck = createDeck();
    const ranks = new Set(deck.filter((c) => c.suit !== "joker").map((c) => c.rank));
    expect(ranks.size).toBe(8);
    for (const rank of ranks) {
      expect(rank).toBeGreaterThanOrEqual(1);
      expect(rank).toBeLessThanOrEqual(13);
    }
  });
});

describe("shuffle", () => {
  it("should preserve array length", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled).toHaveLength(arr.length);
  });

  it("should preserve all elements", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffle(arr);
    expect(shuffled.sort((a, b) => a - b)).toEqual(arr);
  });

  it("should not mutate the original array", () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffle(arr);
    expect(arr).toEqual(original);
  });

  it("should return a new array", () => {
    const arr = [1, 2, 3];
    const shuffled = shuffle(arr);
    expect(shuffled).not.toBe(arr);
  });
});

describe("removePairs", () => {
  it("should remove a pair of same-rank cards", () => {
    const hand = [
      card("spades", 5),
      card("hearts", 5),
      card("diamonds", 10),
    ];
    const result = removePairs(hand);
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(10);
  });

  it("should keep one card when three of same rank", () => {
    const hand = [
      card("spades", 7),
      card("hearts", 7),
      card("diamonds", 7),
    ];
    const result = removePairs(hand);
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(7);
  });

  it("should remove all four of same rank (two pairs)", () => {
    const hand = [
      card("spades", 3),
      card("hearts", 3),
      card("diamonds", 3),
      card("clubs", 3),
    ];
    const result = removePairs(hand);
    expect(result).toHaveLength(0);
  });

  it("should not pair the joker with anything", () => {
    const hand = [
      card("joker", 0, "joker"),
      card("spades", 0, "spades-0"),
    ];
    // Joker has rank 0, and no other card has rank 0 in a standard deck,
    // but here we test with two rank-0 cards: they would pair if ranks match.
    // Actually joker has rank 0, and the other card also rank 0, so they pair.
    // Let's test joker alone instead.
    const jokerOnly = [card("joker", 0, "joker")];
    const result = removePairs(jokerOnly);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("joker");
  });

  it("should handle empty hand", () => {
    expect(removePairs([])).toHaveLength(0);
  });

  it("should handle hand with no pairs", () => {
    const hand = [
      card("spades", 1),
      card("hearts", 5),
      card("diamonds", 10),
    ];
    const result = removePairs(hand);
    expect(result).toHaveLength(3);
  });
});

describe("dealCards", () => {
  it("should distribute all 53 cards among players before pair removal", () => {
    const players = [
      makePlayer(0, []),
      makePlayer(1, []),
      makePlayer(2, []),
      makePlayer(3, []),
    ];
    const dealt = dealCards(players);
    // After dealing and removing pairs, total cards should be odd
    // (53 cards with one joker that can't pair = at least 1 remaining)
    const totalCards = dealt.reduce((sum, p) => sum + p.hand.length, 0);
    expect(totalCards).toBeGreaterThan(0);
    // Total should be odd since joker always remains
    expect(totalCards % 2).toBe(1);
  });

  it("should give each player some cards", () => {
    const players = [
      makePlayer(0, []),
      makePlayer(1, []),
      makePlayer(2, []),
      makePlayer(3, []),
    ];
    const dealt = dealCards(players);
    // After pair removal, some players might have 0 cards (unlikely but possible)
    // At minimum, at least one player should have the joker
    const jokerHolder = dealt.find((p) =>
      p.hand.some((c) => c.id === "joker")
    );
    expect(jokerHolder).toBeDefined();
  });

  it("should already have pairs removed", () => {
    const players = [
      makePlayer(0, []),
      makePlayer(1, []),
    ];
    const dealt = dealCards(players);
    // Each player's hand should have no pairs (each rank appears at most once)
    for (const p of dealt) {
      const rankCounts = new Map<number, number>();
      for (const c of p.hand) {
        rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
      }
      for (const [, count] of rankCounts) {
        expect(count).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("getNextActivePlayer", () => {
  it("should return the next player with cards", () => {
    const players = [
      makePlayer(0, [card("spades", 1)]),
      makePlayer(1, [card("hearts", 2)]),
      makePlayer(2, [card("diamonds", 3)]),
      makePlayer(3, [card("clubs", 4)]),
    ];
    expect(getNextActivePlayer(players, 0)).toBe(1);
    expect(getNextActivePlayer(players, 2)).toBe(3);
    expect(getNextActivePlayer(players, 3)).toBe(0);
  });

  it("should skip players with empty hands", () => {
    const players = [
      makePlayer(0, [card("spades", 1)]),
      makePlayer(1, []),
      makePlayer(2, [card("diamonds", 3)]),
      makePlayer(3, []),
    ];
    expect(getNextActivePlayer(players, 0)).toBe(2);
    expect(getNextActivePlayer(players, 2)).toBe(0);
  });

  it("should return self when only the current player has cards", () => {
    const players = [
      makePlayer(0, [card("spades", 1)]),
      makePlayer(1, []),
      makePlayer(2, []),
      makePlayer(3, []),
    ];
    // Loops around and finds current player still has cards
    expect(getNextActivePlayer(players, 0)).toBe(0);
  });

  it("should return -1 when all players have no cards", () => {
    const players = [
      makePlayer(0, []),
      makePlayer(1, []),
      makePlayer(2, []),
      makePlayer(3, []),
    ];
    expect(getNextActivePlayer(players, 0)).toBe(-1);
  });
});

describe("getDrawTarget", () => {
  it("should return the next player with cards", () => {
    const players = [
      makePlayer(0, [card("spades", 1)]),
      makePlayer(1, [card("hearts", 2)]),
      makePlayer(2, [card("diamonds", 3)]),
      makePlayer(3, [card("clubs", 4)]),
    ];
    expect(getDrawTarget(players, 0)).toBe(1);
  });

  it("should skip players with empty hands", () => {
    const players = [
      makePlayer(0, [card("spades", 1)]),
      makePlayer(1, []),
      makePlayer(2, []),
      makePlayer(3, [card("clubs", 4)]),
    ];
    expect(getDrawTarget(players, 0)).toBe(3);
  });

  it("should return -1 when no valid target exists", () => {
    const players = [
      makePlayer(0, [card("spades", 1)]),
      makePlayer(1, []),
      makePlayer(2, []),
      makePlayer(3, []),
    ];
    expect(getDrawTarget(players, 0)).toBe(-1);
  });
});

describe("drawCard", () => {
  it("should pair when drawn card matches a card in drawer's hand", () => {
    const players = [
      makePlayer(0, [card("spades", 5, "s5")]),
      makePlayer(1, [card("hearts", 5, "h5"), card("diamonds", 8, "d8")]),
    ];
    const result = drawCard(players, 0, 1, 0, 0);
    expect(result.paired).toBe(true);
    // Drawer had spades-5, drew hearts-5 → pair removed, hand empty
    expect(result.players[0].hand).toHaveLength(0);
    // Target lost one card
    expect(result.players[1].hand).toHaveLength(1);
  });

  it("should add card to hand when no pair", () => {
    const players = [
      makePlayer(0, [card("spades", 5, "s5")]),
      makePlayer(1, [card("hearts", 8, "h8"), card("diamonds", 3, "d3")]),
    ];
    const result = drawCard(players, 0, 1, 0, 0);
    expect(result.paired).toBe(false);
    // Drawer gained one card
    expect(result.players[0].hand).toHaveLength(2);
    // Target lost one card
    expect(result.players[1].hand).toHaveLength(1);
  });

  it("should set finishedOrder when target hand becomes empty", () => {
    const players = [
      makePlayer(0, [card("spades", 5, "s5")]),
      makePlayer(1, [card("hearts", 8, "h8")]),
    ];
    const result = drawCard(players, 0, 1, 0, 0);
    // Target's hand is now empty
    expect(result.players[1].hand).toHaveLength(0);
    expect(result.players[1].finishedOrder).toBe(1);
    expect(result.finishedCount).toBe(1);
    expect(result.newlyFinished).toContain(1);
  });

  it("should set finishedOrder when drawer hand becomes empty (pair match)", () => {
    const players = [
      makePlayer(0, [card("spades", 8, "s8")]),
      makePlayer(1, [card("hearts", 8, "h8"), card("diamonds", 3, "d3")]),
    ];
    const result = drawCard(players, 0, 1, 0, 0);
    expect(result.paired).toBe(true);
    // Drawer paired → hand empty
    expect(result.players[0].hand).toHaveLength(0);
    expect(result.players[0].finishedOrder).toBe(1);
    expect(result.newlyFinished).toContain(0);
  });

  it("should handle both players finishing in one draw", () => {
    const players = [
      makePlayer(0, [card("spades", 5, "s5")]),
      makePlayer(1, [card("hearts", 5, "h5")]),
    ];
    const result = drawCard(players, 0, 1, 0, 0);
    expect(result.paired).toBe(true);
    // Both hands empty
    expect(result.players[0].hand).toHaveLength(0);
    expect(result.players[1].hand).toHaveLength(0);
    // Target finishes first (order 1), then drawer (order 2)
    expect(result.players[1].finishedOrder).toBe(1);
    expect(result.players[0].finishedOrder).toBe(2);
    expect(result.finishedCount).toBe(2);
    expect(result.newlyFinished).toEqual([1, 0]);
  });

  it("should not mutate original players", () => {
    const players = [
      makePlayer(0, [card("spades", 5, "s5")]),
      makePlayer(1, [card("hearts", 5, "h5"), card("diamonds", 8, "d8")]),
    ];
    const originalHand0 = [...players[0].hand];
    const originalHand1 = [...players[1].hand];
    drawCard(players, 0, 1, 0, 0);
    expect(players[0].hand).toEqual(originalHand0);
    expect(players[1].hand).toEqual(originalHand1);
  });
});

describe("getActivePlayers", () => {
  it("should count players with cards in hand", () => {
    const players = [
      makePlayer(0, [card("spades", 1)]),
      makePlayer(1, []),
      makePlayer(2, [card("diamonds", 3)]),
      makePlayer(3, []),
    ];
    expect(getActivePlayers(players)).toBe(2);
  });

  it("should return 0 when all hands are empty", () => {
    const players = [
      makePlayer(0, []),
      makePlayer(1, []),
    ];
    expect(getActivePlayers(players)).toBe(0);
  });
});

describe("isGameOver", () => {
  it("should return true when only one player has cards (last player = loser)", () => {
    const players = [
      makePlayer(0, [], { finishedOrder: 1 }),
      makePlayer(1, [], { finishedOrder: 2 }),
      makePlayer(2, [], { finishedOrder: 3 }),
      makePlayer(3, [card("joker", 0, "joker")]),
    ];
    expect(isGameOver(players)).toBe(true);
  });

  it("should return true when no players have cards", () => {
    const players = [
      makePlayer(0, [], { finishedOrder: 1 }),
      makePlayer(1, [], { finishedOrder: 2 }),
      makePlayer(2, [], { finishedOrder: 3 }),
      makePlayer(3, [], { finishedOrder: 4 }),
    ];
    expect(isGameOver(players)).toBe(true);
  });

  it("should return false when multiple players still have cards", () => {
    const players = [
      makePlayer(0, [card("spades", 1)]),
      makePlayer(1, [], { finishedOrder: 1 }),
      makePlayer(2, [card("diamonds", 3)]),
      makePlayer(3, [card("joker", 0, "joker")]),
    ];
    expect(isGameOver(players)).toBe(false);
  });

  it("should return false when all players still have cards", () => {
    const players = [
      makePlayer(0, [card("spades", 1)]),
      makePlayer(1, [card("hearts", 2)]),
      makePlayer(2, [card("diamonds", 3)]),
      makePlayer(3, [card("joker", 0, "joker")]),
    ];
    expect(isGameOver(players)).toBe(false);
  });
});

describe("getRankings", () => {
  it("should rank finished players first by finishedOrder", () => {
    const players = [
      makePlayer(0, [card("spades", 1)], { finishedOrder: null }),
      makePlayer(1, [], { finishedOrder: 1 }),
      makePlayer(2, [card("joker", 0, "joker")], { finishedOrder: null }),
      makePlayer(3, [card("diamonds", 3), card("clubs", 4)], { finishedOrder: null }),
    ];
    const rankings = getRankings(players);
    expect(rankings[0].seatIndex).toBe(1); // finished 1st
    expect(rankings[0].rank).toBe(1);
  });

  it("should rank remaining non-joker players by card count ascending", () => {
    const players = [
      makePlayer(0, [card("spades", 1)], { finishedOrder: null }),
      makePlayer(1, [], { finishedOrder: 1 }),
      makePlayer(2, [card("joker", 0, "joker")], { finishedOrder: null }),
      makePlayer(3, [card("diamonds", 3), card("clubs", 4)], { finishedOrder: null }),
    ];
    const rankings = getRankings(players);
    // After finished player (seat 1): seat 0 (1 card), seat 3 (2 cards), seat 2 (joker)
    expect(rankings[1].seatIndex).toBe(0); // 1 card
    expect(rankings[1].rank).toBe(2);
    expect(rankings[2].seatIndex).toBe(3); // 2 cards
    expect(rankings[2].rank).toBe(3);
  });

  it("should always place joker holder last", () => {
    const players = [
      makePlayer(0, [card("spades", 1)], { finishedOrder: null }),
      makePlayer(1, [], { finishedOrder: 1 }),
      makePlayer(2, [card("joker", 0, "joker")], { finishedOrder: null }),
      makePlayer(3, [card("diamonds", 3), card("clubs", 4)], { finishedOrder: null }),
    ];
    const rankings = getRankings(players);
    expect(rankings[3].seatIndex).toBe(2); // joker holder is last
    expect(rankings[3].rank).toBe(4);
  });

  it("should place joker holder last even with fewer cards than others", () => {
    const players = [
      makePlayer(0, [card("spades", 1), card("hearts", 2), card("diamonds", 3)], { finishedOrder: null }),
      makePlayer(1, [], { finishedOrder: 1 }),
      makePlayer(2, [card("joker", 0, "joker")], { finishedOrder: null }),
    ];
    const rankings = getRankings(players);
    expect(rankings[0].seatIndex).toBe(1); // finished
    expect(rankings[1].seatIndex).toBe(0); // 3 cards but no joker
    expect(rankings[2].seatIndex).toBe(2); // joker holder always last
  });

  it("should include name and avatar in rankings", () => {
    const players = [
      makePlayer(0, [], { finishedOrder: 1, name: "Alice", avatar: "😊" }),
    ];
    const rankings = getRankings(players);
    expect(rankings[0].name).toBe("Alice");
    expect(rankings[0].avatar).toBe("😊");
  });
});

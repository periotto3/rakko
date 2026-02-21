export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export interface Card {
  id: string;
  suit: Suit | "joker";
  rank: number;
  label: string;
}

export interface Player {
  connectionId: string;
  name: string;
  avatar: string;
  seatIndex: number;
  hand: Card[];
  finishedOrder: number | null;
}

export interface RouletteSlot {
  key: string;
  value: string;
  slotIndex: number;
}

export type GamePhase = "waiting" | "playing" | "finished";

export interface GameState {
  gameId: string;
  phase: GamePhase;
  players: Player[];
  currentTurnIndex: number;
  finishedCount: number;
  version: number;
}

// Client → Server
export type ClientMessage =
  | { action: "join"; playerName: string }
  | { action: "draw_card"; cardIndex: number }
  | { action: "get_state" };

// Server → Client
export type ServerMessage =
  | {
      type: "waiting";
      waitingCount: number;
      decidedSlots: RouletteSlot[];
      newSlot: RouletteSlot | null;
      slotCandidates: Record<string, string[]>;
    }
  | {
      type: "game_start";
      gameId: string;
      yourSeatIndex: number;
      yourHand: Card[];
      players: PublicPlayer[];
      currentTurnSeat: number;
    }
  | {
      type: "game_state";
      phase: GamePhase;
      yourHand: Card[];
      players: PublicPlayer[];
      currentTurnSeat: number;
    }
  | {
      type: "card_drawn";
      drawerSeat: number;
      targetSeat: number;
      paired: boolean;
    }
  | { type: "game_over"; rankings: Ranking[] }
  | { type: "error"; message: string };

export interface PublicPlayer {
  name: string;
  avatar: string;
  seatIndex: number;
  cardCount: number;
  finishedOrder: number | null;
}

export interface Ranking {
  seatIndex: number;
  name: string;
  avatar: string;
  rank: number;
}

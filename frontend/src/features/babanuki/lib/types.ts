export type Suit = "compute" | "storage" | "database" | "network" | "frontend" | "management";

export interface Card {
  id: string;
  suit: Suit | "joker";
  rank: number; // 1-13, 0 for joker
  label: string; // AWSサービス名 or "請求書"
  imageUrl: string; // AWSアイコン画像URL
}

export interface BabanukiPlayer {
  id: string;
  name: string;
  isCPU: boolean;
  hand: Card[];
  finishedOrder: number | null; // 上がり順 (1st, 2nd, etc.)
  avatar: string;
}

export type GamePhase =
  | "title"
  | "waiting"
  | "generating"
  | "playing"
  | "result";

export type GameMode = "cpu" | "online";

export interface ThemeSlot {
  work: string;  // 作品
  when: string;  // いつ
  where: string; // どこで
  style: string; // 画風
}

export interface BabanukiState {
  phase: GamePhase;
  players: BabanukiPlayer[];
  currentTurnIndex: number;
  targetPlayerIndex: number;
  theme: ThemeSlot | null;
  finishedCount: number;
  winner: BabanukiPlayer | null;
  generationProgress: number;
}

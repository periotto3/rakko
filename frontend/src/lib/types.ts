// ============================================
// AWS Resource Types
// ============================================

export const AWS_CATEGORIES = [
  "compute",
  "storage",
  "database",
  "networking",
  "serverless",
  "security",
] as const;
export type AWSCategory = (typeof AWS_CATEGORIES)[number]; //カテゴリーのどれかが入る

export type AWSResource = {
  id: string;
  service: string;
  category: AWSCategory;
  displayName: string;
  description: string;
  icon: string;
  tier: 1 | 2 | 3;
};

// ============================================
// Architecture Evaluation
// ============================================

export type ArchitectureEvaluation = {
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
  title: string;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
};

// ============================================
// Player
// ============================================

export type Player = {
  id: string;
  name: string;
  isCPU: boolean;
  hand: AWSResource[];
  selectedResources: AWSResource[];
  isReady: boolean;
  evaluation?: ArchitectureEvaluation;
  avatar: string;
  hasDiscarded: boolean;
  hasSubmitted: boolean;
  totalScore: number;
};

// ============================================
// Game Phases
// ============================================

export type GamePhase =
  | "idle"
  | "lobby"
  | "drafting"
  | "building"
  | "evaluating"
  | "roundResult"
  | "result";
// GamePhaseはこれらのどれか一つだけを持てる
// ============================================
// Player Actions
// ============================================

export type PlayerAction =
  | { type: "ready" }
  | { type: "discard"; discardIndex: number }
  | { type: "select-resource"; resourceId: string }
  | { type: "submit-architecture" };

// ============================================
// Game State
// ============================================

export type GameState = {
  players: Player[];
  resourcePool: AWSResource[];
  discardPile: AWSResource[];
  currentPlayerIndex: number;
  phase: GamePhase;
  round: number;
  maxRounds: number;
};

// ============================================
// Game Events (WebSocket移行用)
// ============================================

export type GameEvent =
  | { type: "PLAYER_JOINED"; player: Player }
  | { type: "PLAYER_READY"; playerId: string }
  | { type: "GAME_STARTED"; state: GameState }
  | { type: "ACTION_PERFORMED"; playerId: string; action: PlayerAction }
  | {
      type: "EVALUATION_COMPLETE";
      results: Record<string, ArchitectureEvaluation>;
    }
  | { type: "GAME_ENDED"; rankings: RankedPlayer[] };

export type RankedPlayer = {
  player: Player;
  rank: number;
  evaluation: ArchitectureEvaluation;
};

// ============================================
// CPU Personality
// ============================================

export type CPUPersonality = "serverless-fan" | "traditional" | "balanced";// いったんCPUなのでここは破棄予定？

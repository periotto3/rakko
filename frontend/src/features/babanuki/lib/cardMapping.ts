import { Card } from "./types";
import { AWS_SERVICES, JOKER_IMAGE_URL } from "./constants";

/** Backend (traditional playing card) の型 */
export type BackendSuit = "spades" | "hearts" | "diamonds" | "clubs";

export interface BackendCard {
  id: string;
  suit: BackendSuit | "joker";
  rank: number; // 1-13, joker は 0
  label: string; // "A", "2"~"K", "JOKER"
}

// コピー識別子 ("a"/"b"/"c"/"d") と Backend suit の対応
const COPY_TO_SUIT: Record<string, BackendSuit> = {
  a: "spades",
  b: "hearts",
  c: "diamonds",
  d: "clubs",
};

const SUIT_TO_COPY: Record<BackendSuit, string> = {
  spades: "a",
  hearts: "b",
  diamonds: "c",
  clubs: "d",
};

const RANK_LABELS: Record<number, string> = {
  1: "A",
  11: "J",
  12: "Q",
  13: "K",
};

/**
 * Backend カード → Frontend カード（AWS サービス情報付き）に変換する。
 * rank を使って AWS_SERVICES から対応するサービスを取得する。
 */
export function backendCardToFrontendCard(backendCard: BackendCard): Card {
  if (backendCard.suit === "joker") {
    return {
      id: backendCard.id,
      suit: "joker",
      rank: 0,
      label: "請求書",
      imageUrl: JOKER_IMAGE_URL,
    };
  }

  const awsService = AWS_SERVICES.find((s) => s.rank === backendCard.rank);
  if (!awsService) {
    throw new Error(`No AWS service found for rank: ${backendCard.rank}`);
  }

  return {
    id: backendCard.id,
    suit: awsService.suit,
    rank: awsService.rank,
    label: awsService.label,
    imageUrl: awsService.imageUrl,
  };
}

/**
 * Frontend カード → Backend カード（従来のトランプ形式）に変換する。
 * id の末尾のコピー識別子 ("a"/"b"/"c"/"d") から Backend suit を導く。
 */
export function frontendCardToBackendCard(frontendCard: Card): BackendCard {
  if (frontendCard.suit === "joker") {
    return {
      id: frontendCard.id,
      suit: "joker",
      rank: 0,
      label: "JOKER",
    };
  }

  // id format: "{rank}-{copy}" (例: "1-a", "5-c")
  const copy = frontendCard.id.split("-").pop() ?? "a";
  const backendSuit: BackendSuit = COPY_TO_SUIT[copy] ?? "spades";
  const rankLabel = RANK_LABELS[frontendCard.rank] ?? String(frontendCard.rank);

  return {
    id: frontendCard.id,
    suit: backendSuit,
    rank: frontendCard.rank,
    label: rankLabel,
  };
}

/**
 * Backend カード配列をまとめて Frontend カード配列に変換する。
 */
export function mapBackendCards(backendCards: BackendCard[]): Card[] {
  return backendCards.map(backendCardToFrontendCard);
}

/**
 * Frontend カード配列をまとめて Backend カード配列に変換する。
 */
export function mapFrontendCards(frontendCards: Card[]): BackendCard[] {
  return frontendCards.map(frontendCardToBackendCard);
}

// Backend の suit/rank → Frontend の copy 文字を取得するヘルパー
export function getSuitCopy(suit: BackendSuit): string {
  return SUIT_TO_COPY[suit];
}

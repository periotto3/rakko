import { Card, BabanukiPlayer } from "../lib/types";

/** 全プレイヤーの公開情報（手札の中身は非公開、枚数のみ） */
export interface PublicPlayerData {
  seatIndex: number;
  name: string;
  avatar: string;
  cardCount: number;
  finishedOrder: number | null;
}

export interface GameStartData {
  yourSeatIndex: number;
  yourHand: Card[];
  players: PublicPlayerData[];
  currentTurnSeat: number;
}

export interface GameStateData {
  yourHand: Card[];
  players: PublicPlayerData[];
  currentTurnSeat: number;
}

export interface CardDrawnData {
  drawerSeat: number;
  targetSeat: number;
  paired: boolean;
}

export interface RankingData {
  seatIndex: number;
  name: string;
  avatar: string;
  rank: number; // 1=1位(勝ち), 4=4位(負け)
}

/**
 * ゲームサービスのインターフェース。
 * CPU実装とオンライン実装を同一のインターフェースで差し替え可能にする（DIP）。
 */
export interface GameService {
  /** ゲームに参加する（接続〜マッチング開始） */
  join(playerName: string): void;
  /** ゲームを開始する（CPUモード: カード配布+開始, オンライン: no-op） */
  startGame(): void;
  /** カードを引く（自分のターン時のみ有効） */
  drawCard(cardIndex: number): void;

  /** マッチング待機中（N人目が参加） */
  onWaiting(cb: (waitingCount: number) => void): void;
  /** 待機中プレイヤー一覧更新（CPUモード: 1人ずつ追加, オンライン: no-op） */
  onWaitingPlayers(cb: (players: BabanukiPlayer[]) => void): void;
  /** ゲーム開始（4人揃った） */
  onGameStart(cb: (data: GameStartData) => void): void;
  /** ゲーム状態更新（ターン進行ごと） */
  onGameState(cb: (data: GameStateData) => void): void;
  /** カードが引かれた（アニメーション用） */
  onCardDrawn(cb: (data: CardDrawnData) => void): void;
  /** ゲーム終了 */
  onGameOver(cb: (rankings: RankingData[]) => void): void;
  /** エラー */
  onError(cb: (message: string) => void): void;

  /** 切断・タイマークリアなどのクリーンアップ */
  dispose(): void;
}

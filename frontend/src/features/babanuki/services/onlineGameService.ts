import {
  GameService,
  GameStartData,
  GameStateData,
  CardDrawnData,
  RankingData,
  PublicPlayerData,
} from "./gameService";
import { WEBSOCKET_ORIGIN } from "./websocket";
import { backendCardToFrontendCard, BackendCard } from "../lib/cardMapping";

const SEAT_AVATARS = [
  "/avatars/user.png",
  "/avatars/cpu_1.png",
  "/avatars/cpu_2.png",
  "/avatars/cpu_3.png",
];

function assignAvatars<T extends { seatIndex: number }>(players: T[]): (T & { avatar: string })[] {
  return players.map((p) => ({ ...p, avatar: SEAT_AVATARS[p.seatIndex] ?? "/avatars/user.png" }));
}

/**
 * オンラインモードの GameService 実装。
 * WebSocket 経由でバックエンドと通信し、GameService インターフェースを提供する。
 */
export class OnlineGameService implements GameService {
  private ws: WebSocket | null = null;
  private playerName = "";

  private waitingCb?: (waitingCount: number) => void;
  private gameStartCb?: (data: GameStartData) => void;
  private gameStateCb?: (data: GameStateData) => void;
  private cardDrawnCb?: (data: CardDrawnData) => void;
  private gameOverCb?: (rankings: RankingData[]) => void;
  private errorCb?: (message: string) => void;

  onWaiting(cb: (waitingCount: number) => void): void { this.waitingCb = cb; }
  onGameStart(cb: (data: GameStartData) => void): void { this.gameStartCb = cb; }
  onGameState(cb: (data: GameStateData) => void): void { this.gameStateCb = cb; }
  onCardDrawn(cb: (data: CardDrawnData) => void): void { this.cardDrawnCb = cb; }
  onGameOver(cb: (rankings: RankingData[]) => void): void { this.gameOverCb = cb; }
  onError(cb: (message: string) => void): void { this.errorCb = cb; }

  join(playerName: string): void {
    this.playerName = playerName;
    this.ws = new WebSocket(WEBSOCKET_ORIGIN);

    this.ws.onopen = () => {
      this.send({ action: "join", playerName });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as Record<string, unknown>;
        this.handleMessage(msg);
      } catch {
        this.errorCb?.("Failed to parse server message");
      }
    };

    this.ws.onclose = () => {
      // 再接続時は get_state を自動送信して状態を復元する
      // TODO: 再接続ロジックの実装（Phase 後続で対応）
    };

    this.ws.onerror = () => {
      this.errorCb?.("WebSocket connection error");
    };
  }

  drawCard(cardIndex: number): void {
    this.send({ action: "draw_card", cardIndex });
  }

  // サーバー主導でゲームが開始されるため、クライアント側では何もしない
  startGame(): void {}

  dispose(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case "waiting":
        this.waitingCb?.(msg.waitingCount as number);
        break;

      case "game_start": {
        const yourHand = (msg.yourHand as BackendCard[]).map(backendCardToFrontendCard);
        this.gameStartCb?.({
          yourSeatIndex: msg.yourSeatIndex as number,
          yourHand,
          players: assignAvatars(msg.players as PublicPlayerData[]),
          currentTurnSeat: msg.currentTurnSeat as number,
        });
        break;
      }

      case "game_state": {
        const yourHand = (msg.yourHand as BackendCard[]).map(backendCardToFrontendCard);
        this.gameStateCb?.({
          yourHand,
          players: assignAvatars(msg.players as PublicPlayerData[]),
          currentTurnSeat: msg.currentTurnSeat as number,
        });
        break;
      }

      case "card_drawn":
        this.cardDrawnCb?.({
          drawerSeat: msg.drawerSeat as number,
          targetSeat: msg.targetSeat as number,
          paired: msg.paired as boolean,
        });
        break;

      case "game_over":
        this.gameOverCb?.(assignAvatars(msg.rankings as RankingData[]));
        break;

      case "error":
        this.errorCb?.(msg.message as string);
        break;
    }
  }
}

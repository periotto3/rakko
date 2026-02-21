# クリーンアーキテクチャ設計書

## 概要

本ドキュメントは、WebSocket カードゲームバックエンドをクリーンアーキテクチャに基づいてリファクタリングするための設計書です。

### 設計原則

- **依存性の方向**: 外側（Infrastructure/Presentation）→ 内側（Application → Domain）への一方向のみ
- **Domain Layer はどこにも依存しない**: 純粋な TypeScript のみで構成
- **Repository パターン**: Domain 層にインターフェースを定義し、Infrastructure 層で実装
- **UseCase パターン**: 1 UseCase = 1 ビジネスユースケース

```
┌──────────────────────────────────────────────────┐
│                Presentation Layer                 │
│         (Lambda Handlers, Message Router)         │
├──────────────────────────────────────────────────┤
│                Application Layer                  │
│              (UseCases, Services)                 │
├──────────────────────────────────────────────────┤
│                 Domain Layer                      │
│    (Entities, Value Objects, Repository I/F)      │
├──────────────────────────────────────────────────┤
│              Infrastructure Layer                 │
│      (DynamoDB, API Gateway, AWS SDK)            │
└──────────────────────────────────────────────────┘
         ↑ 依存方向: 外側 → 内側
```

---

## ディレクトリ構成

```
lambda/
├── index.ts                              # エントリポイント（DI コンテナ構築 + ハンドラ登録）
│
├── domain/                               # Domain Layer（純粋な型・ロジック、外部依存なし）
│   ├── error/
│   │   └── domainError.ts                #   ドメインエラー定義
│   ├── model/
│   │   ├── card/
│   │   │   ├── card.ts                   #   Card Value Object
│   │   │   └── suit.ts                   #   Suit Value Object
│   │   ├── player/
│   │   │   ├── player.ts                 #   Player Entity
│   │   │   └── publicPlayer.ts           #   PublicPlayer Value Object（公開情報）
│   │   ├── game/
│   │   │   ├── game.ts                   #   Game Entity（Aggregate Root）
│   │   │   ├── gamePhase.ts              #   GamePhase Value Object
│   │   │   ├── ranking.ts               #   Ranking Value Object
│   │   │   └── gameRepository.ts         #   Game Repository Interface
│   │   ├── connection/
│   │   │   ├── connection.ts             #   Connection Entity
│   │   │   └── connectionRepository.ts   #   Connection Repository Interface
│   │   └── matchmaking/
│   │       ├── matchmaking.ts            #   Matchmaking Entity（待機プレイヤーキュー）
│   │       ├── rouletteSlot.ts           #   RouletteSlot Value Object
│   │       └── matchmakingRepository.ts  #   Matchmaking Repository Interface
│   └── service/
│       ├── deckService.ts                #   デッキ生成・シャッフル・配布ロジック
│       └── drawService.ts               #   カードを引くロジック・ペア判定
│
├── application/                          # Application Layer（ユースケース）
│   ├── error/
│   │   └── applicationError.ts           #   アプリケーションエラー定義
│   ├── service/
│   │   └── notificationService.ts        #   通知サービス Interface（WebSocket送信抽象）
│   └── useCase/
│       ├── connectUseCase.ts             #   WebSocket接続時の処理
│       ├── disconnectUseCase.ts          #   WebSocket切断時の処理
│       ├── joinGameUseCase.ts            #   マッチメイキング参加 + ゲーム開始
│       ├── drawCardUseCase.ts            #   カードを引く
│       └── getStateUseCase.ts            #   現在のゲーム状態取得
│
├── infrastructure/                       # Infrastructure Layer（技術的実装）
│   ├── dynamodb/
│   │   ├── dynamoDBClient.ts             #   DynamoDB クライアント生成
│   │   ├── gameDynamoDBRepository.ts     #   Game Repository DynamoDB 実装
│   │   ├── connectionDynamoDBRepository.ts  # Connection Repository DynamoDB 実装
│   │   └── matchmakingDynamoDBRepository.ts # Matchmaking Repository DynamoDB 実装
│   └── websocket/
│       └── apiGatewayNotificationService.ts # 通知サービス API Gateway 実装
│
└── presentation/                         # Presentation Layer（Lambda ハンドラ）
    ├── handler/
    │   ├── connectHandler.ts             #   $connect ルート
    │   ├── disconnectHandler.ts          #   $disconnect ルート
    │   └── messageHandler.ts             #   $default ルート（メッセージルーティング）
    └── dto/
        ├── clientMessage.ts              #   クライアント → サーバーのメッセージ型
        └── serverMessage.ts              #   サーバー → クライアントのメッセージ型
```

---

## レイヤー詳細設計

### 1. Domain Layer

外部ライブラリに一切依存しない純粋な TypeScript コードで構成される。ビジネスルールの中核。

#### 1.1 Value Objects

**Card** (`domain/model/card/card.ts`)
```typescript
export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export interface Card {
  readonly id: string;
  readonly suit: Suit | "joker";
  readonly rank: number;
  readonly label: string;
}
```

**GamePhase** (`domain/model/game/gamePhase.ts`)
```typescript
export type GamePhase = "waiting" | "playing" | "finished";
```

**Ranking** (`domain/model/game/ranking.ts`)
```typescript
export interface Ranking {
  readonly seatIndex: number;
  readonly name: string;
  readonly avatar: string;
  readonly rank: number;
}
```

**PublicPlayer** (`domain/model/player/publicPlayer.ts`)
```typescript
export interface PublicPlayer {
  readonly name: string;
  readonly avatar: string;
  readonly seatIndex: number;
  readonly cardCount: number;
  readonly finishedOrder: number | null;
}
```

**RouletteSlot** (`domain/model/matchmaking/rouletteSlot.ts`)
```typescript
export interface RouletteSlot {
  readonly key: string;
  readonly value: string;
  readonly slotIndex: number;
}
```

#### 1.2 Entities

**Player** (`domain/model/player/player.ts`)
```typescript
import { Card } from "../card/card";

export interface Player {
  readonly connectionId: string;
  readonly name: string;
  readonly avatar: string;
  readonly seatIndex: number;
  hand: Card[];
  finishedOrder: number | null;
}
```

**Game（Aggregate Root）** (`domain/model/game/game.ts`)
```typescript
import { Player } from "../player/player";
import { GamePhase } from "./gamePhase";

export interface Game {
  readonly gameId: string;
  phase: GamePhase;
  players: Player[];
  currentTurnIndex: number;
  finishedCount: number;
  version: number;
}
```

**Connection** (`domain/model/connection/connection.ts`)
```typescript
export interface Connection {
  readonly connectionId: string;
  playerName: string;
  gameId: string | null;
}
```

**Matchmaking** (`domain/model/matchmaking/matchmaking.ts`)
```typescript
export interface WaitingPlayer {
  readonly connectionId: string;
  readonly playerName: string;
}
```

#### 1.3 Repository Interfaces

**GameRepository** (`domain/model/game/gameRepository.ts`)
```typescript
import { Game } from "./game";

export interface GameRepository {
  create(game: Game): Promise<void>;
  findById(gameId: string): Promise<Game | null>;
  update(game: Game): Promise<void>; // 楽観ロック付き
}
```

**ConnectionRepository** (`domain/model/connection/connectionRepository.ts`)
```typescript
import { Connection } from "./connection";

export interface ConnectionRepository {
  save(connection: Connection): Promise<void>;
  findById(connectionId: string): Promise<Connection | null>;
  delete(connectionId: string): Promise<void>;
  updateGameId(connectionId: string, gameId: string): Promise<void>;
}
```

**MatchmakingRepository** (`domain/model/matchmaking/matchmakingRepository.ts`)
```typescript
import { WaitingPlayer } from "./matchmaking";
import { RouletteSlot } from "./rouletteSlot";

export interface MatchmakingRepository {
  addPlayer(connectionId: string, playerName: string): Promise<void>;
  removePlayer(connectionId: string): Promise<void>;
  getWaitingPlayers(): Promise<WaitingPlayer[]>;
  getRouletteState(): Promise<RouletteSlot[]>;
  saveRouletteState(slots: RouletteSlot[]): Promise<void>;
  deleteRouletteState(): Promise<void>;
}
```

#### 1.4 Domain Services

**DeckService** (`domain/service/deckService.ts`)

デッキ生成・シャッフル・カード配布・ペア除去のロジック。現在の `game-logic.ts` から `createDeck`, `shuffle`, `removePairs`, `dealCards` を移動。

```typescript
import { Card } from "../model/card/card";
import { Player } from "../model/player/player";

export function createDeck(): Card[];
export function shuffle<T>(arr: T[]): T[];
export function removePairs(hand: Card[]): Card[];
export function dealCards(players: Player[]): Player[];
```

**DrawService** (`domain/service/drawService.ts`)

カードを引くロジック・ターン進行・ゲーム終了判定。現在の `game-logic.ts` から `drawCard`, `getNextActivePlayer`, `getDrawTarget`, `isGameOver`, `getRankings` を移動。

```typescript
import { Player } from "../model/player/player";
import { Ranking } from "../model/game/ranking";

export interface DrawResult {
  players: Player[];
  finishedCount: number;
  paired: boolean;
  newlyFinished: number[];
}

export function drawCard(players: Player[], drawerIndex: number, targetIndex: number, cardIndex: number, finishedCount: number): DrawResult;
export function getNextActivePlayer(players: Player[], currentIndex: number): number;
export function getDrawTarget(players: Player[], currentIndex: number): number;
export function isGameOver(players: Player[]): boolean;
export function getRankings(players: Player[]): Ranking[];
```

---

### 2. Application Layer

Domain Layer のみに依存。Infrastructure の詳細は知らない。

#### 2.1 Notification Service Interface

WebSocket 送信の抽象化。Application 層に定義し、Infrastructure 層で実装する。

**NotificationService** (`application/service/notificationService.ts`)
```typescript
import { Game } from "../domain/model/game/game";
import { ServerMessage } from "../presentation/dto/serverMessage";

export interface NotificationService {
  sendToConnection(connectionId: string, message: ServerMessage): Promise<void>;
  broadcastToGame(game: Game, message: ServerMessage): Promise<void>;
  sendPersonalizedState(game: Game): Promise<void>;
}
```

> **注**: `ServerMessage` 型は DTO として Presentation 層に配置するが、
> NotificationService が参照するため Application 層からの参照を許可する。
> 厳密にしたい場合は Application 層に独自のメッセージ型を定義して Presentation 層で変換する。

#### 2.2 Application Errors

**ApplicationError** (`application/error/applicationError.ts`)
```typescript
export class ApplicationError extends Error {
  constructor(
    public readonly type: "NOT_IN_GAME" | "GAME_NOT_ACTIVE" | "NOT_YOUR_TURN" | "INVALID_CARD_INDEX" | "NO_DRAW_TARGET",
    message: string
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
```

#### 2.3 UseCases

**ConnectUseCase** (`application/useCase/connectUseCase.ts`)
```typescript
export class ConnectUseCase {
  constructor(private connectionRepo: ConnectionRepository) {}

  async execute(connectionId: string): Promise<void> {
    await this.connectionRepo.save({ connectionId, playerName: "", gameId: null });
  }
}
```

**DisconnectUseCase** (`application/useCase/disconnectUseCase.ts`)
```typescript
export class DisconnectUseCase {
  constructor(
    private connectionRepo: ConnectionRepository,
    private matchmakingRepo: MatchmakingRepository,
  ) {}

  async execute(connectionId: string): Promise<void> {
    await this.matchmakingRepo.removePlayer(connectionId);
    await this.connectionRepo.delete(connectionId);

    const remaining = await this.matchmakingRepo.getWaitingPlayers();
    if (remaining.length === 0) {
      await this.matchmakingRepo.deleteRouletteState();
    }
  }
}
```

**JoinGameUseCase** (`application/useCase/joinGameUseCase.ts`)
```typescript
// マッチメイキング参加 → 4人揃ったらゲーム開始
export class JoinGameUseCase {
  constructor(
    private connectionRepo: ConnectionRepository,
    private matchmakingRepo: MatchmakingRepository,
    private gameRepo: GameRepository,
    private notificationService: NotificationService,
  ) {}

  async execute(connectionId: string, playerName: string): Promise<void> {
    // 1. Connection保存 + マッチメイキングキュー追加
    // 2. 待機プレイヤー数チェック
    // 3. ルーレットスロット決定
    // 4. 4人未満: waiting メッセージ送信
    // 5. 4人: ゲーム作成 → game_start 送信
  }
}
```

**DrawCardUseCase** (`application/useCase/drawCardUseCase.ts`)
```typescript
// カードを引く → ペア判定 → ゲーム終了判定
export class DrawCardUseCase {
  constructor(
    private connectionRepo: ConnectionRepository,
    private gameRepo: GameRepository,
    private notificationService: NotificationService,
  ) {}

  async execute(connectionId: string, cardIndex: number): Promise<void> {
    // 1. Connection からゲームID取得
    // 2. Game 取得 + バリデーション（フェーズ、ターン）
    // 3. DrawService でカード引く
    // 4. card_drawn ブロードキャスト
    // 5. ゲーム終了判定 → game_over or 次のターンへ
    // 6. Game 更新（楽観ロック）
  }
}
```

**GetStateUseCase** (`application/useCase/getStateUseCase.ts`)
```typescript
// 現在のゲーム状態を返す
export class GetStateUseCase {
  constructor(
    private connectionRepo: ConnectionRepository,
    private gameRepo: GameRepository,
    private notificationService: NotificationService,
  ) {}

  async execute(connectionId: string): Promise<void> {
    // 1. Connection からゲームID取得
    // 2. Game 取得
    // 3. パーソナライズした状態を送信
  }
}
```

---

### 3. Infrastructure Layer

外部サービス（AWS SDK）への具体的な接続。Domain 層の Repository Interface を実装する。

#### 3.1 DynamoDB Client

**dynamoDBClient.ts** (`infrastructure/dynamodb/dynamoDBClient.ts`)
```typescript
// DynamoDB DocumentClient のシングルトン生成
// テーブル名は環境変数から取得
```

#### 3.2 Repository 実装

**GameDynamoDBRepository** (`infrastructure/dynamodb/gameDynamoDBRepository.ts`)
```typescript
// GameRepository を implements
// PK: GAME#{gameId}, SK: META
// 楽観ロック: ConditionExpression version = :v
```

**ConnectionDynamoDBRepository** (`infrastructure/dynamodb/connectionDynamoDBRepository.ts`)
```typescript
// ConnectionRepository を implements
// PK: CONN#{connectionId}, SK: CONN
```

**MatchmakingDynamoDBRepository** (`infrastructure/dynamodb/matchmakingDynamoDBRepository.ts`)
```typescript
// MatchmakingRepository を implements
// マッチメイキング: PK: MATCHMAKING, SK: CONN#{connectionId}
// ルーレット: PK: MATCHMAKING, SK: ROULETTE
```

#### 3.3 Notification Service 実装

**ApiGatewayNotificationService** (`infrastructure/websocket/apiGatewayNotificationService.ts`)
```typescript
// NotificationService を implements
// ApiGatewayManagementApiClient で WebSocket メッセージ送信
// GoneException (410) 時にコネクション削除
```

---

### 4. Presentation Layer

Lambda イベントを受け取り、UseCase を呼び出す。レスポンスを返す。

#### 4.1 DTO（Data Transfer Objects）

**ClientMessage** (`presentation/dto/clientMessage.ts`)
```typescript
// クライアント → サーバーのメッセージ型定義
export type ClientMessage =
  | { action: "join"; playerName: string }
  | { action: "draw_card"; cardIndex: number }
  | { action: "get_state" };
```

**ServerMessage** (`presentation/dto/serverMessage.ts`)
```typescript
// サーバー → クライアントのメッセージ型定義（全種類）
export type ServerMessage =
  | WaitingMessage
  | GameStartMessage
  | GameStateMessage
  | CardDrawnMessage
  | GameOverMessage
  | ErrorMessage;
```

#### 4.2 Handlers

**connectHandler.ts** (`presentation/handler/connectHandler.ts`)
```typescript
// APIGatewayProxyWebsocketEventV2 → ConnectUseCase.execute()
```

**disconnectHandler.ts** (`presentation/handler/disconnectHandler.ts`)
```typescript
// APIGatewayProxyWebsocketEventV2 → DisconnectUseCase.execute()
```

**messageHandler.ts** (`presentation/handler/messageHandler.ts`)
```typescript
// body をパース → action に応じて UseCase を呼び分け
// エラーハンドリング（ApplicationError → error メッセージ送信）
```

---

### 5. エントリポイント（DI 構築）

**index.ts** (`lambda/index.ts`)

```typescript
import { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";

// Infrastructure
import { createDynamoDBClient } from "./infrastructure/dynamodb/dynamoDBClient";
import { GameDynamoDBRepository } from "./infrastructure/dynamodb/gameDynamoDBRepository";
import { ConnectionDynamoDBRepository } from "./infrastructure/dynamodb/connectionDynamoDBRepository";
import { MatchmakingDynamoDBRepository } from "./infrastructure/dynamodb/matchmakingDynamoDBRepository";
import { ApiGatewayNotificationService } from "./infrastructure/websocket/apiGatewayNotificationService";

// UseCases
import { ConnectUseCase } from "./application/useCase/connectUseCase";
import { DisconnectUseCase } from "./application/useCase/disconnectUseCase";
import { JoinGameUseCase } from "./application/useCase/joinGameUseCase";
import { DrawCardUseCase } from "./application/useCase/drawCardUseCase";
import { GetStateUseCase } from "./application/useCase/getStateUseCase";

// Presentation
import { createConnectHandler } from "./presentation/handler/connectHandler";
import { createDisconnectHandler } from "./presentation/handler/disconnectHandler";
import { createMessageHandler } from "./presentation/handler/messageHandler";

// --- DI Container（手動コンストラクタ注入）---
const ddb = createDynamoDBClient();

const gameRepo = new GameDynamoDBRepository(ddb);
const connectionRepo = new ConnectionDynamoDBRepository(ddb);
const matchmakingRepo = new MatchmakingDynamoDBRepository(ddb);

// NotificationService は endpoint が実行時に決まるため、ファクトリで生成
function createNotificationService(endpoint: string) {
  return new ApiGatewayNotificationService(endpoint, connectionRepo);
}

const connectUseCase = new ConnectUseCase(connectionRepo);
const disconnectUseCase = new DisconnectUseCase(connectionRepo, matchmakingRepo);

// --- Lambda Handler Exports ---
export const connectHandler = createConnectHandler(connectUseCase);
export const disconnectHandler = createDisconnectHandler(disconnectUseCase);
export const messageHandler = createMessageHandler(
  (endpoint) => new JoinGameUseCase(connectionRepo, matchmakingRepo, gameRepo, createNotificationService(endpoint)),
  (endpoint) => new DrawCardUseCase(connectionRepo, gameRepo, createNotificationService(endpoint)),
  (endpoint) => new GetStateUseCase(connectionRepo, gameRepo, createNotificationService(endpoint)),
);
```

---

## 依存関係図

```
index.ts (Composition Root)
    │
    ├── presentation/handler/*
    │       │
    │       └── application/useCase/*
    │               │
    │               ├── domain/model/*/   (Entity, Value Object)
    │               ├── domain/service/*  (Domain Service)
    │               └── domain/model/*/   (Repository Interface)
    │
    └── infrastructure/*
            │
            └── domain/model/*/           (Repository Interface を implements)
```

**ルール**:
- `domain/` は何にも依存しない（純粋 TypeScript のみ）
- `application/` は `domain/` にのみ依存
- `infrastructure/` は `domain/` の Repository Interface を実装
- `presentation/` は `application/` の UseCase を呼ぶ
- `index.ts` が全てを組み立てる（Composition Root）

---

## 既存コードとの対応表

| 既存ファイル | 移動先 | 備考 |
|---|---|---|
| `lib/types.ts` (Card, Suit) | `domain/model/card/` | Value Object |
| `lib/types.ts` (Player) | `domain/model/player/` | Entity |
| `lib/types.ts` (GameState) | `domain/model/game/game.ts` | Aggregate Root |
| `lib/types.ts` (GamePhase) | `domain/model/game/gamePhase.ts` | Value Object |
| `lib/types.ts` (PublicPlayer) | `domain/model/player/publicPlayer.ts` | Value Object |
| `lib/types.ts` (Ranking) | `domain/model/game/ranking.ts` | Value Object |
| `lib/types.ts` (RouletteSlot) | `domain/model/matchmaking/rouletteSlot.ts` | Value Object |
| `lib/types.ts` (ClientMessage) | `presentation/dto/clientMessage.ts` | DTO |
| `lib/types.ts` (ServerMessage) | `presentation/dto/serverMessage.ts` | DTO |
| `lib/game-logic.ts` (createDeck, shuffle, removePairs, dealCards) | `domain/service/deckService.ts` | Domain Service |
| `lib/game-logic.ts` (drawCard, getNextActivePlayer, etc.) | `domain/service/drawService.ts` | Domain Service |
| `lib/theme-data.ts` | `domain/service/deckService.ts` 付近 or `domain/model/matchmaking/` | テーマデータ |
| `lib/db.ts` (Connection系) | `infrastructure/dynamodb/connectionDynamoDBRepository.ts` | Repository 実装 |
| `lib/db.ts` (Game系) | `infrastructure/dynamodb/gameDynamoDBRepository.ts` | Repository 実装 |
| `lib/db.ts` (Matchmaking系) | `infrastructure/dynamodb/matchmakingDynamoDBRepository.ts` | Repository 実装 |
| `lib/broadcast.ts` | `infrastructure/websocket/apiGatewayNotificationService.ts` | Service 実装 |
| `lib/actions/join.ts` | `application/useCase/joinGameUseCase.ts` | UseCase |
| `lib/actions/draw-card.ts` | `application/useCase/drawCardUseCase.ts` | UseCase |
| `lib/actions/get-state.ts` | `application/useCase/getStateUseCase.ts` | UseCase |
| `index.ts` (connectHandler) | `presentation/handler/connectHandler.ts` | Handler |
| `index.ts` (disconnectHandler) | `presentation/handler/disconnectHandler.ts` | Handler |
| `index.ts` (messageHandler) | `presentation/handler/messageHandler.ts` | Handler |

---

## テスタビリティの向上

クリーンアーキテクチャ化により、以下のテストが容易になる：

| テスト対象 | 方法 |
|---|---|
| **Domain Service** (deckService, drawService) | 純粋関数のため、モック不要でユニットテスト可能 |
| **UseCase** | Repository / NotificationService をモックして振る舞いテスト |
| **Infrastructure** | DynamoDB Local やモッククライアントで統合テスト |
| **Presentation** | Lambda イベントを構築して Handler をテスト |

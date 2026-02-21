# アーキテクチャ

## システム構成

```
┌──────────┐   WebSocket    ┌─────────────────┐    Lambda     ┌──────────────┐
│          │◄──────────────►│  API Gateway     │─────────────►│   Lambda     │
│ クライアント│                │  (WebSocket API) │              │  Functions   │
│          │                │                  │              │              │
└──────────┘                │  Routes:         │              │ • connect    │
                            │  • $connect      │              │ • disconnect │
                            │  • $disconnect   │              │ • message    │
                            │  • $default      │              └──────┬───────┘
                            └─────────────────┘                     │
                                                                    ▼
                                                             ┌──────────────┐
                                                             │  DynamoDB    │
                                                             │              │
                                                             │ • コネクション │
                                                             │ • マッチング   │
                                                             │ • ゲーム状態   │
                                                             └──────────────┘
```

## AWSリソース

| リソース               | 説明                        |
| ---------------------- | --------------------------- |
| API Gateway WebSocket  | WebSocket接続のエンドポイント |
| Lambda (connect)       | 接続時のコネクション登録      |
| Lambda (disconnect)    | 切断時のクリーンアップ        |
| Lambda (message)       | 全メッセージのルーティング    |
| DynamoDB               | ゲームデータの永続化         |

**リージョン:** ap-northeast-1 (東京)
**ステージ:** dev

---

## DynamoDB テーブル設計

単一テーブル設計。PK/SKの組み合わせで3種類のレコードを管理する。

| レコード種別   | PK                  | SK                  | TTL    |
| -------------- | ------------------- | ------------------- | ------ |
| コネクション   | `CONN#<connId>`     | `CONN`              | 2時間  |
| マッチング待機 | `MATCHMAKING`       | `CONN#<connId>`     | 2時間  |
| ゲーム状態     | `GAME#<gameId>`     | `META`              | 2時間  |

### コネクション

```json
{
  "PK": "CONN#abc123",
  "SK": "CONN",
  "connectionId": "abc123",
  "playerName": "たろう",
  "gameId": "uuid-xxx",
  "ttl": 1740200000
}
```

### マッチング待機

```json
{
  "PK": "MATCHMAKING",
  "SK": "CONN#abc123",
  "connectionId": "abc123",
  "playerName": "たろう",
  "ttl": 1740200000
}
```

### ゲーム状態

```json
{
  "PK": "GAME#uuid-xxx",
  "SK": "META",
  "gameId": "uuid-xxx",
  "phase": "playing",
  "players": [...],
  "currentTurnIndex": 0,
  "finishedCount": 0,
  "version": 1,
  "ttl": 1740200000
}
```

- `version`: 楽観的ロックに使用。更新時に現在のバージョンを条件にして競合を防止。
- `ttl`: 全レコード2時間後に自動削除。

---

## Lambda ルーティング

```
$connect    → connectHandler    → コネクション保存
$disconnect → disconnectHandler → マッチング削除 & コネクション削除
$default    → messageHandler    → アクション振り分け
                                    ├── "join"      → handleJoin
                                    ├── "draw_card" → handleDrawCard
                                    └── "get_state" → handleGetState
```

---

## ファイル構成

```
lambda/
├── index.ts                  # 3つのLambdaハンドラー (connect/disconnect/message)
└── lib/
    ├── types.ts              # 型定義 (Card, Player, GameState, メッセージ型)
    ├── game-logic.ts         # ゲームロジック (デッキ, シャッフル, ペア除去, ターン管理)
    ├── db.ts                 # DynamoDB操作
    ├── broadcast.ts          # WebSocketメッセージ送信
    └── actions/
        ├── join.ts           # マッチング & ゲーム開始
        ├── draw-card.ts      # カードを引く処理
        └── get-state.ts      # 現在の状態取得
lib/
└── websocket-stack.ts        # CDKスタック定義
```

# WebSocket API 仕様書

## 接続

```
wss://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/dev
```

---

## クライアント → サーバー メッセージ

### `join` — ゲームに参加

```json
{ "action": "join", "playerName": "たろう" }
```

| フィールド   | 型     | 説明           |
| ------------ | ------ | -------------- |
| `action`     | string | `"join"`       |
| `playerName` | string | プレイヤー名   |

### `draw_card` — カードを引く

```json
{ "action": "draw_card", "cardIndex": 0 }
```

| フィールド  | 型     | 説明                             |
| ----------- | ------ | -------------------------------- |
| `action`    | string | `"draw_card"`                    |
| `cardIndex` | number | 引くカードのインデックス (0始まり) |

### `get_state` — 現在の状態を取得

```json
{ "action": "get_state" }
```

---

## サーバー → クライアント メッセージ

### `waiting` — マッチング待機中

4人揃うまで、待機中の全員に送信される。

```json
{
  "type": "waiting",
  "waitingCount": 2
}
```

| フィールド     | 型     | 説明             |
| -------------- | ------ | ---------------- |
| `waitingCount` | number | 現在の待機人数 (1〜3) |

### `game_start` — ゲーム開始

4人揃った時点で各プレイヤーに個別送信される。

```json
{
  "type": "game_start",
  "gameId": "uuid-xxx",
  "yourSeatIndex": 0,
  "yourHand": [
    { "id": "spades-1", "suit": "spades", "rank": 1, "label": "A" },
    { "id": "hearts-10", "suit": "hearts", "rank": 10, "label": "10" }
  ],
  "players": [
    { "name": "たろう", "avatar": "😊", "seatIndex": 0, "cardCount": 5, "finishedOrder": null },
    { "name": "じろう", "avatar": "🐱", "seatIndex": 1, "cardCount": 6, "finishedOrder": null }
  ],
  "currentTurnSeat": 0
}
```

| フィールド        | 型             | 説明                     |
| ----------------- | -------------- | ------------------------ |
| `gameId`          | string         | ゲームID (UUID)          |
| `yourSeatIndex`   | number         | 自分の席番号 (0〜3)      |
| `yourHand`        | Card[]         | 自分の手札 (自分だけに見える) |
| `players`         | PublicPlayer[] | 全プレイヤーの公開情報    |
| `currentTurnSeat` | number         | 最初のターンの席番号      |

### `game_state` — ゲーム状態更新

カードを引いた後、またはget_stateリクエスト時に各プレイヤーに個別送信される。

```json
{
  "type": "game_state",
  "phase": "playing",
  "yourHand": [...],
  "players": [...],
  "currentTurnSeat": 2
}
```

| フィールド        | 型             | 説明                          |
| ----------------- | -------------- | ----------------------------- |
| `phase`           | string         | `"waiting"` / `"playing"` / `"finished"` |
| `yourHand`        | Card[]         | 自分の手札                    |
| `players`         | PublicPlayer[] | 全プレイヤーの公開情報        |
| `currentTurnSeat` | number         | 現在のターンの席番号           |

### `card_drawn` — カードが引かれた

カードを引いた直後に全員にブロードキャストされる。

```json
{
  "type": "card_drawn",
  "drawerSeat": 0,
  "targetSeat": 1,
  "paired": true
}
```

| フィールド   | 型      | 説明                               |
| ------------ | ------- | ---------------------------------- |
| `drawerSeat` | number  | 引いたプレイヤーの席番号            |
| `targetSeat` | number  | 引かれたプレイヤーの席番号          |
| `paired`     | boolean | ペアが成立したか (true=2枚捨てた)   |

### `game_over` — ゲーム終了

ゲーム終了時に全員にブロードキャストされる。

```json
{
  "type": "game_over",
  "rankings": [
    { "seatIndex": 2, "name": "さぶろう", "avatar": "🐶", "rank": 1 },
    { "seatIndex": 0, "name": "たろう",   "avatar": "😊", "rank": 2 },
    { "seatIndex": 1, "name": "じろう",   "avatar": "🐱", "rank": 3 },
    { "seatIndex": 3, "name": "しろう",   "avatar": "🐰", "rank": 4 }
  ]
}
```

| フィールド | 型        | 説明                      |
| ---------- | --------- | ------------------------- |
| `rankings` | Ranking[] | 順位一覧 (1位=勝ち, 4位=負け) |

### `error` — エラー

```json
{
  "type": "error",
  "message": "Not your turn"
}
```

| エラーメッセージ                                    | 発生条件                     |
| --------------------------------------------------- | ---------------------------- |
| `"You are not in a game"`                           | ゲーム外でdraw_card/get_state |
| `"Game is not active"`                              | ゲームが playing 状態でない   |
| `"Not your turn"`                                   | 自分のターンでない            |
| `"No valid target to draw from"`                    | 引ける相手がいない            |
| `"Invalid card index. Target has N cards (0-N-1)"`  | cardIndex が範囲外            |
| `"Unknown action"`                                  | 不明なアクション              |

---

## データ型

### Card

```typescript
{
  id: string       // "spades-1", "hearts-10", "joker" など
  suit: string     // "spades" | "hearts" | "diamonds" | "clubs" | "joker"
  rank: number     // 1〜13 (A〜K), ジョーカーは 0
  label: string    // "A", "2"〜"10", "J", "Q", "K", "JOKER"
}
```

### PublicPlayer

他プレイヤーから見える公開情報。手札の中身は見えず枚数のみ。

```typescript
{
  name: string            // プレイヤー名
  avatar: string          // アバター絵文字 ("😊", "🐱", "🐶", "🐰")
  seatIndex: number       // 席番号 (0〜3)
  cardCount: number       // 手札の枚数
  finishedOrder: number | null  // 上がり順 (null=まだプレイ中)
}
```

### Ranking

```typescript
{
  seatIndex: number  // 席番号
  name: string       // プレイヤー名
  avatar: string     // アバター絵文字
  rank: number       // 順位 (1=1位, 4=最下位)
}
```

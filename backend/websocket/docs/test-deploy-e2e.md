# ババ抜きWebSocketサーバー — テスト〜デプロイ〜E2E 全体手順

## Context

テスト実装は完了済み（54テスト全パス）。このドキュメントは、ローカルテスト → デプロイ → リモートE2Eテストの一連の流れを説明する。

---

## Step 1: ローカルユニットテスト実行（AWS不要）

```bash
# 全テスト実行（54テスト）
npm test

# ゲームロジックのみ（30テスト）
npx jest test/game-logic.test.ts

# アクションハンドラーのみ（14テスト）
npx jest test/actions.test.ts

# ウォッチモード（ファイル変更時に自動再実行）
npx jest --watch
```

**確認:** `Tests: 54 passed` と表示されればOK。

---

## Step 2: CDKテンプレート確認

```bash
cdk synth --profile 20260221_Progate_aws
```

**確認:** CloudFormationテンプレートがエラーなく出力されればOK。

---

## Step 3: AWSへデプロイ

```bash
cdk deploy --profile 20260221_Progate_aws
```

**確認:** デプロイ完了後、出力に `WebSocketUrl` が表示される。
例: `wss://xxxxx.execute-api.ap-northeast-1.amazonaws.com/dev`

このURLを控えておく。

---

## Step 4: リモートE2Eテスト（手動）

### 4-1. 準備

```bash
# wscat をインストール（未インストールの場合）
npm install -g wscat
```

### 4-2. 4人のプレイヤーで接続（ターミナル4つ開く）

```bash
# ターミナル1〜4 それぞれで実行:
wscat -c wss://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/dev
```

### 4-3. マッチメイキング（各ターミナルで順番にjoin送信）

```
ターミナル1: {"action":"join","playerName":"Player1"}
ターミナル2: {"action":"join","playerName":"Player2"}
ターミナル3: {"action":"join","playerName":"Player3"}
ターミナル4: {"action":"join","playerName":"Player4"}
```

**確認ポイント:**
- 1〜3人目 → `{"type":"waiting","waitingCount":N}` を受信
- 4人目参加 → 全員が `{"type":"game_start",...}` を受信
- 各プレイヤーの `yourHand` が異なること

### 4-4. カードを引く（currentTurnSeat のプレイヤーのターミナルで）

```json
{"action":"draw_card","cardIndex":0}
```

**確認ポイント:**
- 全員が `{"type":"card_drawn","drawerSeat":N,"targetSeat":N,"paired":true/false}` を受信
- 全員が `{"type":"game_state",...}` を受信（手札は自分のみ見える）

### 4-5. ゲーム状態確認（任意のタイミングで）

```json
{"action":"get_state"}
```

### 4-6. ゲーム終了まで 4-4 を繰り返す

**確認:** 最後に全員が `{"type":"game_over","rankings":[...]}` を受信

---

## Step 5: エラーケース確認

```
# 他人のターンで引こうとする
{"action":"draw_card","cardIndex":0}
→ {"type":"error","message":"Not your turn"}

# ゲーム外で状態取得
{"action":"get_state"}
→ {"type":"error","message":"You are not in a game"}
```

---

## チェックリスト

- [ ] `npm test` → 54テスト全パス
- [ ] `npx cdk synth` → テンプレート生成成功
- [ ] `npx cdk deploy` → デプロイ成功
- [ ] wscat 4人接続 → `game_start` 受信
- [ ] ターンプレイヤーが `draw_card` → 全員に `card_drawn` 配信
- [ ] ゲーム終了 → `game_over` + `rankings` 受信
- [ ] エラーケース（Not your turn 等）が正しく返る

# クリーンアーキテクチャ レビュー: WebSocket ババ抜きバックエンド

## 総合評価

ハッカソンプロジェクトとして非常に高い品質。4層のクリーンアーキテクチャ（Domain → Application → Infrastructure / Presentation）が明確に分離され、依存性逆転・リポジトリパターン・不変オブジェクトが正しく実装されている。以下にカテゴリ別の改善点を挙げる。

---

## 1. UseCase の肥大化

### 1-A. JoinGameUseCase（208行）— 最大の問題

**現状**: 1つの `execute()` に6つの責務が混在している。

| 行 | 責務 |
|---|---|
| 33-34 | Connection保存 + キュー追加 |
| 38-45 | ルーレットスロット割り当て（ドメインロジック） |
| 47-61 | 待機中プレイヤーへの通知 |
| 63-94 | マッチ成立 → キュー削除 → 通知 |
| 96-131 | 画像生成（プロンプト構築・API呼び出し・結果通知） |
| 132-172 | ゲーム作成（Player生成・Deck配り・永続化・game_start送信） |
| 173-205 | エラーリカバリ（キューへの復帰） |

**改善案**:

**(A) `GameFactory` をドメイン層に抽出** (`lambda/domain/model/game/gameFactory.ts`)
```typescript
export class GameFactory {
  static create(gameId: string, matchedPlayers: WaitingPlayer[]): Game {
    const AVATARS = ["😊", "🐱", "🐶", "🐰"];
    let players = matchedPlayers.map((w, i) =>
      new Player(w.connectionId, w.playerName, AVATARS[i], i, [], null)
    );
    players = Deck.deal(players);
    return new Game(gameId, "playing", players, 0, 0, 1);
  }
}
```
→ JoinGameUseCase 133-140行目を1行に削減

**(B) ルーレットスロット割り当てをドメインサービスに移動**
現在の40-44行目はドメインロジックがUseCaseに漏れ出している。`MatchmakingService` や `MatchmakingQueue` 集約に移動すべき。

**(C) `Player.toPublic()` メソッド追加**
`PublicPlayer` への変換が JoinGameUseCase(150-159行), GetStateUseCase, ApiGatewayNotificationService の3箇所に重複。
```typescript
// Player に追加
toPublic(): PublicPlayer {
  return new PublicPlayer(this._name, this._avatar, this._seatIndex, this._hand.length, this._finishedOrder);
}
// Game に追加
get publicPlayers(): PublicPlayer[] {
  return this._players.map(p => p.toPublic());
}
```

### 1-B. DrawCardUseCase（100行）— ドメインロジックの漏出

**問題**: 66-75行目の「残りプレイヤーへの finishedOrder 割り当て」は純粋なドメインロジックだがUseCaseにある。

```typescript
// 現状（UseCase内）
const remaining = players.filter(p => p.finishedOrder === null);
for (const p of remaining) {
  finishedCount++;
  // ... withFinishedOrder()
}
```

**改善案**: Game集約に `assignRemainingOrders()` メソッドを追加。
```typescript
// Game に追加
assignRemainingOrders(): Game {
  let players = [...this._players];
  let count = this._finishedCount;
  for (const p of players.filter(p => p.finishedOrder === null)) {
    count++;
    players = players.map(pl =>
      pl.seatIndex === p.seatIndex ? pl.withFinishedOrder(count) : pl
    );
  }
  return new Game(this._gameId, this._phase, players, this._currentTurnIndex, count, this._version);
}
```
→ DrawCardUseCase 65-77行が `updatedGame = updatedGame.assignRemainingOrders().finish()` の1行に。

---

## 2. クリーンアーキテクチャ違反

### 2-A. Domain → Presentation の依存（重大）

**ファイル**: `lambda/domain/model/notification/notificationService.ts:2`
```typescript
import { ServerMessage } from "../../../presentation/dto/serverMessage.js";
```

ドメイン層がプレゼンテーション層のDTOに依存している。依存性の方向が逆。

**改善案**: `ServerMessage` の型をドメイン層に移動するか、`unknown` 型にして Infrastructure/Presentation 層で型を付ける。

### 2-B. Infrastructure にプレゼンテーションロジック

**ファイル**: `apiGatewayNotificationService.ts:47-71`

`sendPersonalizedState()` が `PublicPlayer` を組み立て、`game_state` メッセージ構造を構築している。これはプレゼンテーション層の責務。UseCase側でメッセージを構築し、NotificationService は配送のみを担当すべき。

---

## 3. AWS 固有の改善点

### 3-A. API Gateway WebSocket 29秒タイムアウト（重大）

**問題**: `websocket-stack.ts:59` で `messageFn` のタイムアウトを90秒に設定しているが、**API Gateway WebSocket の統合タイムアウトは29秒が上限**（REST APIのみ延長可能、WebSocket APIは不可）。

画像生成の `TIMEOUT_MS = 70_000`（70秒）+ リトライ3回は確実にタイムアウトする。

**改善案（ハッカソン向け簡易版）**:
- 画像生成のタイムアウトを20秒、リトライを1回に縮小（合計約25秒以内に収める）
- あるいは画像生成を非同期化（Lambda invoke async → 完了後にWebSocket通知）

**改善案（本番向け）**:
- Step Functions でオーケストレーション
- または SQS + 別Lambda で画像生成を非同期処理

**補足**: WebSocket API ではクライアント側のコネクション自体は維持されるため、29秒のタイムアウトは「Lambda統合のレスポンスを待つ時間」に適用される。Lambdaは裏で走り続けるが、API Gatewayがクライアントに504を返す。ただし、WebSocket接続自体は切断されないので、Lambda内から`PostToConnection`で直接クライアントに通知を送ることは可能。つまり、`join`アクション自体のレスポンスは29秒以内に返しつつ、画像生成完了後に別途WebSocketメッセージを送る設計にすれば、Lambda 90秒タイムアウトのままでも動作する可能性がある。

### 3-B. ApiGatewayManagementApiClient の毎回生成

**ファイル**: `apiGatewayNotificationService.ts:22-24`

`sendToConnection()` のたびに `new ApiGatewayManagementApiClient()` を生成している。4人への `broadcastToGame` で4回インスタンス化。

**改善案**: コンストラクタでクライアントを1回だけ生成してキャッシュ。

### 3-C. CDK スタックの改善

| 項目 | 現状 | 改善案 |
|---|---|---|
| メモリ | 未指定（128MB） | `messageFn` は256-512MBに。コールドスタート改善 + CPU割り当て増加 |
| アーキテクチャ | 未指定（x86_64） | `Architecture.ARM64` で34%コスト削減 |
| `IMAGE_API_URL` | `process.env.IMAGE_API_URL!` (synth時) | SSM Parameter Store から取得に変更 |
| IAM | connect/disconnectFn に ManageConnections 付与 | WebSocket送信しないので不要。最小権限に |
| connectFn/disconnectFn | DynamoDB ReadWrite | connect は Write のみ、disconnect は ReadWrite で十分 |

### 3-D. DynamoDB 改善

1. **`gameDynamoDBRepository.create()` に条件式なし**: `PutCommand` に `ConditionExpression: "attribute_not_exists(PK)"` を追加して重複作成を防止
2. **マッチメイキングの競合状態**: 2つの同時 `join` が両方とも4人目と判断する可能性。DynamoDB トランザクション（`TransactWriteItems`）でキュー削除とゲーム作成をアトミックに
3. **TTL計算の重複**: `ttl()` 関数が3つのリポジトリにコピペ。共通ユーティリティに抽出

---

## 4. エラーハンドリングと耐障害性

### 4-A. ゲーム中の切断未対応

`DisconnectUseCase` はマッチメイキングキューからの削除と Connection 削除のみ。**ゲーム中に切断したプレイヤーの処理がない**。ゲームが永遠にスタックする。

**改善案**: 切断時に `gameId` があればゲームからプレイヤーを除外し、残りプレイヤーに通知。

### 4-B. リカバリでルーレット状態が復元されない

JoinGameUseCase の catch ブロック（173-205行）でプレイヤーをキューに復帰させるが、71行目で削除したルーレット状態は復元されない。

### 4-C. 楽観ロック失敗のハンドリング

`gameDynamoDBRepository.update()` は `version` で楽観ロックしているが、`ConditionalCheckFailedException` をキャッチする処理がない。

### 4-D. 入力バリデーション不足

`messageHandler.ts:21` で `JSON.parse` 後、`ClientMessage` 型としてキャストしているだけで**ランタイム検証なし**。`playerName` が未定義、巨大文字列、`cardIndex` が文字列のケースが未対応。

---

## 5. ドメインモデルの充実化

Game 集約に追加すべきメソッド:
- `assignRemainingOrders(): Game` — 前述
- `findPlayerByConnectionId(id): Player | undefined` — UseCase内での `findIndex` を集約に
- `get publicPlayers`: `PublicPlayer[]` — 変換ロジックの一元化

Player エンティティに追加すべきメソッド:
- `toPublic(): PublicPlayer`
- `get isActive(): boolean` (hand.length > 0)
- `get hasJoker(): boolean`

Connection エンティティ:
- `updateGameId()` リポジトリメソッドを廃止し、`withGameId()` で新インスタンスを返して `save()` に統一

---

## 6. テスト戦略

### 現状のカバレッジ
- `game-logic.test.ts` (539行): ドメインロジックのテスト — 良い
- `actions.test.ts` (462行): UseCase の統合テスト — 良い

### 不足しているテスト
- `HttpImageGenerationService` のリトライ・タイムアウト・レスポンスパース
- `promptBuilder.ts` のプロンプト生成ロジック
- JoinGameUseCase のエラーリカバリパス（画像生成失敗時）
- 楽観ロック失敗時の挙動
- CDK スナップショットテスト

---

## 7. セキュリティ

| リスク | 対策 |
|---|---|
| WebSocket認証なし | `$connect` にLambdaオーソライザー追加（本番向け） |
| playerName未サニタイズ | 長さ制限（20文字等）+ XSS対策 |
| `process.env.IMAGE_API_URL!` | 環境変数未設定時のクラッシュ → 明示的チェックに |
| `IMAGE_API_URL` が公開Lambda Function URL | IAM認証追加（本番向け） |

---

## 8. 優先順位付き改善一覧

### 即座に対応すべき（バグ・動作不良）
1. **API Gateway 29秒制限への対応** — 画像生成タイムアウトを20秒+リトライ1回に縮小、または非同期化
2. **ゲーム中の切断処理追加** — ゲームスタック防止

### 設計改善（コード品質）
3. **Domain → Presentation 依存の修正** (`notificationService.ts`)
4. **`Game.assignRemainingOrders()` 抽出** — DrawCardUseCaseからドメインロジックを移動
5. **`GameFactory` 抽出** — JoinGameUseCase の責務削減
6. **`Player.toPublic()` 追加** — 3箇所の重複排除
7. **ApiGatewayManagementApiClient のキャッシュ**

### AWS最適化
8. **Lambda メモリサイズ設定** (256-512MB)
9. **ARM64 アーキテクチャ指定**
10. **connectFn/disconnectFn の不要な IAM 権限削除**
11. **DynamoDB `create()` に条件式追加**

### セキュリティ
12. **入力バリデーション追加** (playerName, cardIndex)
13. **環境変数の明示的チェック**

---

## 参考ソース

- [Amazon API Gateway WebSocket quotas](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html) — 29秒の統合タイムアウト制限
- [API Gateway WebSocket 30s timeout (AWS re:Post)](https://repost.aws/questions/QUFXpcneknSgmhseduEh18dw/api-gateway-websocket-api-30s-timeout) — WebSocket APIでは延長不可の確認
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [AWS CDK TypeScript Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/best-practices-cdk-typescript-iac/typescript-best-practices.html)

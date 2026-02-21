# 画像生成API統合: 複数画像の並列生成

## Context

4人揃ったときに外部の画像生成API（Bedrock Lambda）を呼び出し、背景画像1枚 + キャラクター画像3枚 = 計4枚を並列生成する。全ての画像が揃ってから `game_start` を送信する。完了判定はWSSサーバー（Lambda内）で行う。スコープはバックエンドのみ。

## フロー

```
現在:   4人揃う → カード配布 → game_start

変更後: 4人揃う → "generating"送信 → 4画像を並列生成
        → 各完了時に"image_ready"送信 → 全完了
        → カード配布 → game_start(画像URL付き)
```

## 変更ファイル一覧

### 新規ファイル

| ファイル | 責務 |
|---|---|
| `lambda/application/service/imageGenerationApiClient.ts` | 外部API呼出しインターフェース |
| `lambda/infrastructure/api/imageGenerationApiClientImpl.ts` | fetch実装 (タイムアウト・リトライ付き) |

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `lib/websocket-stack.ts` | タイムアウト10秒→120秒、`IMAGE_API_URL`環境変数追加 |
| `lambda/presentation/dto/serverMessage.ts` | `generating`, `image_ready`型追加、`game_start`に`images`追加 |
| `lambda/application/useCase/joinGameUseCase.ts` | 4人揃った後に画像生成フェーズを追加 |
| `lambda/index.ts` | DI配線追加 |

---

## 実装詳細

### 1. CDKスタック (`lib/websocket-stack.ts`)

```diff
 const messageFn = new NodejsFunction(this, 'MessageFn', {
   ...
-  timeout: cdk.Duration.seconds(10),
+  timeout: cdk.Duration.seconds(120),
 });

 const environment = {
   TABLE_NAME: table.tableName,
+  IMAGE_API_URL: 'https://cznxvcsgufobnrxiv6pzr6z6u40tyyvh.lambda-url.us-east-1.on.aws/',
 };
```

### 2. ServerMessage型 (`lambda/presentation/dto/serverMessage.ts`)

新規メッセージ型を追加:

```ts
| { type: "generating"; gameId: string; totalImages: number }
| { type: "image_ready"; imageType: string; imageUrl: string; completedCount: number; totalImages: number }
```

`game_start`に`images`フィールド追加:

```ts
| {
    type: "game_start";
    ...既存フィールド;
    images: { background: string; characters: string[] };
  }
```

### 3. ImageGenerationApiClient インターフェース (新規)

`lambda/application/service/imageGenerationApiClient.ts`

```ts
export interface ImageGenerationApiClient {
  generateImage(prompt: string, roomId: string): Promise<{ url: string; key: string; fileName: string }>;
}
```

### 4. ImageGenerationApiClientImpl (新規)

`lambda/infrastructure/api/imageGenerationApiClientImpl.ts`

- `fetch` で外部APIにPOST、`AbortController`で60秒タイムアウト
- レスポンスは HTTP Streaming だが `await response.text()` で全文取得
- レスポンス構造: `{ statusCode, body: JSON文字列 }` → bodyをパースして `images[0].url` 取得
- 失敗時は1回リトライ、それでも失敗ならエラーをthrow

### 5. JoinGameUseCase変更 (`lambda/application/useCase/joinGameUseCase.ts`)

コンストラクタに `ImageGenerationApiClient` を追加。

4人揃った後のフロー (現在のL59-118) を以下に変更:

1. `gameId = randomUUID()`
2. ルーレットスロットからプロンプト4つを構築
3. 全員に `"generating"` メッセージを送信
4. `Promise.allSettled()` で4画像を並列生成:
   - 各画像完了時に `completedCount` をインクリメントし `"image_ready"` を全員に送信
   - 失敗した画像はフォールバック画像URLを使用
5. 全画像完了後: カード配布 → ゲーム作成 → `game_start` 送信（画像URL付き）
6. マッチメイキング/ルーレット/接続レコードのクリーンアップ（既存通り）

**プロンプト構築:**

```ts
const theme = slots.map(s => s.value).join(" ");
const prompts = {
  background: `${theme}, [pixel art style], landscape orientation`,
  character_0: `${theme}, character portrait 1, [pixel art style]`,
  character_1: `${theme}, character portrait 2, [pixel art style]`,
  character_2: `${theme}, character portrait 3, [pixel art style]`,
};
```

**画像生成の並列実行:**

```ts
let completedCount = 0;
const imageTypes = ["background", "character_0", "character_1", "character_2"];

const results = await Promise.allSettled(
  imageTypes.map(async (imageType) => {
    const result = await this.imageApiClient.generateImage(prompts[imageType], gameId);
    completedCount++;
    // 全員に image_ready を送信
    await Promise.all(connectionIds.map(connId =>
      this.notificationService.sendToConnection(connId, {
        type: "image_ready", imageType, imageUrl: result.url,
        completedCount, totalImages: 4,
      })
    ));
    return { imageType, url: result.url };
  })
);

// 結果をまとめる (失敗分はフォールバック)
const images = { background: FALLBACK_BG, characters: [FALLBACK_CHAR, FALLBACK_CHAR, FALLBACK_CHAR] };
for (const r of results) {
  if (r.status === "fulfilled") {
    if (r.value.imageType === "background") images.background = r.value.url;
    else { /* characters配列にセット */ }
  }
}
```

### 6. DI配線 (`lambda/index.ts`)

```ts
import { ImageGenerationApiClientImpl } from "./infrastructure/api/imageGenerationApiClientImpl.js";

const imageApiClient = new ImageGenerationApiClientImpl(process.env.IMAGE_API_URL!);

// JoinGameUseCaseファクトリに追加
(endpoint) => new JoinGameUseCase(
  connectionRepo, matchmakingRepo, gameRepo,
  createNotificationService(endpoint),
  imageApiClient  // 追加
),
```

---

## エラーハンドリング

| シナリオ | 対処 |
|---|---|
| 個別画像のAPI失敗 | `ImageGenerationApiClientImpl`内で1回リトライ |
| リトライ後も失敗 | フォールバック画像URLを使用、ゲームは続行 |
| 全体タイムアウト (Lambda 120秒) | `Promise.allSettled`なので部分完了+フォールバックで`game_start`送信 |
| プレイヤー切断中の生成 | 既存の410 GoneException処理で対応済み |

---

## 検証

1. `npm test` で既存テストが通ること
2. `cdk diff` でインフラ変更の差分確認
3. 手動テスト: 4人join → `generating`受信 → `image_ready`×4受信 → `game_start`(images付き)受信

# モックデータ定義ドキュメント

## 概要

Rakkoのフロントエンドは、バックエンド/LLM APIが未接続の状態でも動作するよう、以下のモックデータとロジックを使用しています。

---

## 1. AWSリソースカタログ (`src/lib/resources.ts`)

### 定義

`AWS_RESOURCE_CATALOG` 配列に28種類のAWSサービスがテンプレートとして定義されています。

### 構造

```typescript
type ResourceTemplate = {
  service: string;       // AWSサービス名 (例: "EC2", "Lambda")
  category: AWSCategory; // カテゴリ (compute|storage|database|networking|serverless|security)
  displayName: string;   // 表示名 (例: "EC2 インスタンス")
  description: string;   // 説明 (例: "仮想サーバー")
  icon: string;          // 絵文字アイコン (例: "🖥️")
  tier: 1 | 2 | 3;      // レアリティ (1=コモン, 2=アンコモン, 3=レア)
};
```

### カテゴリ別リソース一覧

| カテゴリ | サービス | ティア | コピー数 |
|----------|----------|--------|----------|
| **compute** | EC2 | 1 | 3 |
| | ECS | 2 | 2 |
| | EKS | 3 | 1 |
| | Fargate | 2 | 2 |
| **storage** | S3 | 1 | 3 |
| | EBS | 1 | 3 |
| | EFS | 2 | 2 |
| **database** | RDS | 1 | 3 |
| | DynamoDB | 2 | 2 |
| | Aurora | 3 | 1 |
| | ElastiCache | 2 | 2 |
| **networking** | VPC | 1 | 3 |
| | CloudFront | 2 | 2 |
| | Route53 | 1 | 3 |
| | ELB | 1 | 3 |
| | APIGateway | 2 | 2 |
| **serverless** | Lambda | 2 | 2 |
| | StepFunctions | 2 | 2 |
| | SQS | 1 | 3 |
| | SNS | 1 | 3 |
| | EventBridge | 2 | 2 |
| **security** | IAM | 1 | 3 |
| | WAF | 2 | 2 |
| | KMS | 2 | 2 |
| | Cognito | 2 | 2 |
| | CloudWatch | 1 | 3 |

### コピー数ルール

- ティア1 (コモン): 3枚
- ティア2 (アンコモン): 2枚
- ティア3 (レア): 1枚

**プール合計**: 56枚

### 使用箇所

- `createResourcePool()` → `gameEngine.ts:startGame()` / `startNextRound()` でラウンド開始時に生成
- シャッフルされた後、各プレイヤーに7枚ずつ配布
- `drawResources()` でプールから指定枚数を引く

---

## 2. CPUプレイヤー (`src/lib/gameEngine.ts`)

### 定義

```typescript
const CPU_PLAYERS = [
  { name: "Sakura",  personality: "serverless-fan", avatar: "🌸" },
  { name: "Hinata",  personality: "traditional",    avatar: "☀️" },
  { name: "Kaede",   personality: "balanced",       avatar: "🍁" },
];
```

### 性格 (CPUPersonality)

| 性格 | 説明 | 好みのサービス |
|------|------|---------------|
| `serverless-fan` | サーバーレス系を優先 | Lambda, APIGateway, DynamoDB, SQS, SNS, StepFunctions, EventBridge, S3, Cognito |
| `traditional` | オンプレ寄りの構成を好む | EC2, ELB, RDS, VPC, EBS, Route53, IAM, CloudWatch, ElastiCache |
| `balanced` | バランス重視、カテゴリ分散 | (特定の嗜好なし、ティアとカテゴリ分散で判断) |

### 使用箇所

- `setupLobby()` でロビーに3CPUを追加
- `applyCPUDiscards()` / `applyCPUSubmissions()` で性格に基づく自動操作

---

## 3. CPU戦略 (`src/lib/cpuStrategy.ts`)

### 捨て戦略 (`decideCPUDiscard`)

- 1〜2枚をランダムに捨てる（60%の確率で1枚、40%で2枚）
- **serverless-fan / traditional**: 嗜好リストに含まれるサービスに+10点、ティアも加算 → スコア低いものを捨てる
- **balanced**: カテゴリ重複に-5ペナルティ + ティアでスコアリング → スコア低いものを捨てる

### 構築選択 (`decideCPUBuildSelection`)

- 手札から5枚を選択
- **balanced**: カテゴリ分散を優先（各カテゴリ1つずつ選び、残りをティア順で補充）
- **serverless-fan / traditional**: 嗜好スコアが高い順に5枚選択

### 使用箇所

- `gameEngine.ts:applyCPUDiscards()` → ドラフトフェーズでCPUの捨て処理
- `gameEngine.ts:applyCPUSubmissions()` → 構築フェーズでCPUの提出処理

---

## 4. モック評価器 (`src/lib/mockEvaluator.ts`)

### シナジーパターン (15種)

| パターン | サービス組み合わせ | ボーナス |
|----------|-------------------|----------|
| サーバーレスAPI | Lambda + APIGateway | 10 |
| サーバーレスDB連携 | Lambda + DynamoDB | 8 |
| 非同期処理 | Lambda + SQS | 8 |
| 負荷分散構成 | EC2 + ELB | 8 |
| Web+DB構成 | EC2 + RDS | 6 |
| 静的配信 | CloudFront + S3 | 8 |
| コンテナLB構成 | ECS + ELB | 8 |
| DBキャッシュ構成 | RDS + ElastiCache | 8 |
| ネットワーク基盤 | VPC + EC2 | 4 |
| コンテナネットワーク | VPC + ECS | 4 |
| 認証認可基盤 | IAM + Cognito | 6 |
| 監視付きサーバーレス | CloudWatch + Lambda | 4 |
| Pub/Subメッセージング | SNS + SQS | 6 |
| グローバル配信 | Route53 + CloudFront | 6 |
| オーケストレーション | StepFunctions + Lambda | 8 |

### アーキテクチャタイトル (7種)

| タイトル | 必要サービス |
|----------|-------------|
| サーバーレスアーキテクチャ | Lambda, APIGateway, DynamoDB |
| 3層Webアプリケーション | EC2, ELB, RDS |
| コンテナベースWebアプリ | ECS, ELB, RDS |
| Kubernetesマイクロサービス | EKS, ELB |
| エッジコンピューティング構成 | CloudFront, S3, Lambda |
| イベント駆動アーキテクチャ | Lambda, SQS, DynamoDB |
| 非同期マイクロサービス | ECS, SQS, RDS |

いずれにも該当しない場合: 「カスタム構成」

### スコアリング計算式

```
最終スコア = カテゴリスコア + シナジースコア + ティアスコア - ペナルティ + ノイズ
```

| 項目 | 計算方法 | 範囲 |
|------|---------|------|
| カテゴリスコア | ユニークカテゴリ数に応じた固定値 (1→5, 2→10, 3→15, 4→22, 5→27, 6→30) | 5〜30 |
| シナジースコア | マッチしたシナジーパターンのボーナス合計 | 0〜40 (上限40) |
| ティアスコア | (ティア合計/リソース数) × 5 | 0〜15 |
| ペナルティ | ネットワーク不足(-8)、セキュリティ不足(-5)、重複(-3) | 0〜-15 (上限15) |
| ノイズ | ランダム 0〜10 | 0〜10 |

**最終スコア**: 0〜100にクランプ

### グレード

| グレード | スコア範囲 |
|----------|-----------|
| S | 90〜100 |
| A | 75〜89 |
| B | 60〜74 |
| C | 40〜59 |
| D | 0〜39 |

### 使用箇所

- `useGame.ts` の `evaluating` フェーズのeffectで全プレイヤーの構成を並列評価
- 評価結果は各プレイヤーの `evaluation` フィールドと `totalScore` に反映

---

## 5. データフロー図

```
リソースカタログ (resources.ts)
  └─→ createResourcePool() → シャッフルされた56枚のプール
       └─→ startGame() / startNextRound() (gameEngine.ts)
            └─→ 各プレイヤーに7枚配布 → GameState.players[].hand

CPUプレイヤー定義 (gameEngine.ts)
  └─→ setupLobby() → GameState.players に3CPU追加

CPU戦略 (cpuStrategy.ts)
  ├─→ decideCPUDiscard() ← applyCPUDiscards() (gameEngine.ts)
  └─→ decideCPUBuildSelection() ← applyCPUSubmissions() (gameEngine.ts)

モック評価器 (mockEvaluator.ts)
  └─→ evaluate() ← useGame.ts evaluatingフェーズeffect
       └─→ GameState.players[].evaluation, totalScore に反映
```

## 6. コンポーネントとデータの対応

| コンポーネント | 受け取るデータ | ソース |
|--------------|--------------|--------|
| `Lobby` | `players: Player[]` | GameState.players |
| `GameTable` | `state: GameState` | GameState全体 |
| `ResourceCard` | `resource: AWSResource` | Player.hand[] の各要素 |
| `ResourcePool` | `remainingCount`, `round`, `maxRounds` | GameState.resourcePool.length, round, maxRounds |
| `ArchitecturePreview` | `resources: AWSResource[]`, `selectedIds` | Player.hand |
| `RoundResultScreen` | `players: Player[]`, `round`, `maxRounds` | GameState.players (evaluation含む) |
| `ResultScreen` | `players: Player[]` | GameState.players (totalScore含む) |

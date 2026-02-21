# Lambda 分割戦略: 単一 Lambda vs アクション別 Lambda

## 目次

1. [はじめに](#はじめに)
2. [2つの構成パターン](#2つの構成パターン)
3. [メリット・デメリット比較](#メリットデメリット比較)
4. [AWS 公式事例: Simple Trivia Service の分析](#aws-公式事例-simple-trivia-service-の分析)
5. [分割基準の判断フレームワーク](#分割基準の判断フレームワーク)
6. [本プロジェクトへの適用と結論](#本プロジェクトへの適用と結論)

---

## はじめに

WebSocket + Lambda 構成のマルチプレイヤーゲームを設計する際、「Lambda をどう分割するか」は重要なアーキテクチャ判断である。本ドキュメントでは、単一 Lambda 構成とアクション別 Lambda 構成を比較分析し、判断基準を整理する。

---

## 2つの構成パターン

### パターン A: ルート別 Lambda（本プロジェクトの現行構成）

```
API Gateway WebSocket
  ├── $connect    → ConnectFn    (lambda/index.connectHandler)
  ├── $disconnect → DisconnectFn (lambda/index.disconnectHandler)
  └── $default    → MessageFn   (lambda/index.messageHandler)
                        ├── action: "join"      → joinGameUseCase
                        ├── action: "draw_card" → drawCardUseCaseFactory
                        └── action: "get_state" → getStateUseCaseFactory
```

- WebSocket の 3 ルート（`$connect`, `$disconnect`, `$default`）に対して 3 つの Lambda を割り当て
- `$default` ハンドラ内でアクション名に応じたルーティングを行う
- ソースコードは単一エントリポイント（`lambda/index.ts`）から 3 ハンドラを export

### パターン B: アクション別 Lambda

```
API Gateway WebSocket
  ├── $connect    → ConnectFn
  ├── $disconnect → DisconnectFn
  ├── join        → JoinFn
  ├── draw_card   → DrawCardFn
  └── get_state   → GetStateFn
```

- WebSocket のカスタムルート機能を使い、各アクションに専用 Lambda を割り当て
- API Gateway の `routeSelectionExpression` でメッセージの `action` フィールドに基づきルーティング

---

## メリット・デメリット比較

### パターン A: ルート別 Lambda（$default で集約）

| 観点 | 評価 |
|------|------|
| **デプロイの単純さ** | 良い。Lambda 関数が 3 つだけなので管理が楽 |
| **コールドスタート** | 良い。`$default` に全リクエストが集中するため、常にウォーム状態を維持しやすい |
| **コードの凝集度** | 良い。関連するアクション間でコードやインスタンスを共有できる |
| **スケーラビリティ** | 注意。全アクションが同一 Lambda の同時実行数を共有する |
| **障害分離** | 弱い。1 つのアクションのバグが全アクションに影響しうる |
| **IAM 権限** | 粗い。全アクションが同じ権限セットを持つ |
| **パッケージサイズ** | 大きくなりがち。全アクションの依存を含むため |

### パターン B: アクション別 Lambda

| 観点 | 評価 |
|------|------|
| **デプロイの単純さ** | やや複雑。Lambda 関数が多くなり IaC の記述量が増える |
| **コールドスタート** | 注意。各 Lambda の呼び出し頻度が分散し、コールドスタートが起きやすい |
| **コードの凝集度** | 良い。各 Lambda が単一責務で理解しやすい |
| **スケーラビリティ** | 良い。アクションごとに独立してスケールする |
| **障害分離** | 強い。1 つのアクションの障害が他に波及しない |
| **IAM 権限** | 細かく設定可能。最小権限の原則に従いやすい |
| **パッケージサイズ** | 小さい。各 Lambda が必要な依存のみを含む |

### 比較まとめ

| 判断軸 | パターン A (ルート別) | パターン B (アクション別) |
|--------|:---:|:---:|
| 小〜中規模プロジェクト | **適している** | オーバーキル |
| 大規模プロジェクト | 限界あり | **適している** |
| チーム開発（複数チーム） | 競合しやすい | **独立開発しやすい** |
| 個人〜少人数開発 | **シンプルで良い** | 管理コスト高 |
| コールドスタートが問題 | **有利** | 不利 |
| 障害分離が重要 | 不利 | **有利** |

---

## AWS 公式事例: Simple Trivia Service の分析

> 参考: [Building a serverless multiplayer game that scales](https://aws.amazon.com/blogs/compute/building-a-serverless-multiplayer-game-that-scales/) (AWS Compute Blog)

### アーキテクチャ概要

Simple Trivia Service は AWS が公式ブログで紹介したサーバーレスマルチプレイヤーゲームのリファレンスアーキテクチャである。

```
WebSocket API Gateway
  ├── $connect     → onConnect Lambda
  ├── $disconnect  → onDisconnect Lambda
  └── $default     → onMessage Lambda (内部でアクション振り分け)

onMessage Lambda
  ├── action に応じて内部ルーティング
  ├── DynamoDB でゲーム状態管理
  └── API Gateway Management API で他プレイヤーに通知
```

### 注目すべき設計判断

1. **$default ルートに集約**: Simple Trivia Service も `$default` ルートで全メッセージを受け、内部で action を振り分けるパターンを採用している
2. **理由**: ゲームのメッセージは頻繁にやり取りされるため、$default Lambda のウォーム状態が維持されやすく、コールドスタートの影響を最小化できる
3. **DynamoDB 単一テーブル設計**: PK/SK パターンでゲーム状態・接続情報・プレイヤー情報を 1 テーブルに格納
4. **Step Functions の活用**: ゲーム進行のタイマー管理やターン制御には Step Functions を使用し、Lambda 側のロジックをシンプルに保つ

### 本プロジェクトとの類似点

| 要素 | Simple Trivia Service | 本プロジェクト |
|------|----------------------|--------------|
| Lambda 構成 | 3 Lambda（connect / disconnect / default） | 3 Lambda（同構成） |
| ルーティング | $default 内で action 分岐 | $default 内で action 分岐 |
| DB 設計 | DynamoDB 単一テーブル | DynamoDB 単一テーブル |
| 通知方法 | API Gateway Management API | API Gateway Management API |
| IaC | SAM | CDK |

本プロジェクトは Simple Trivia Service と非常に近い設計判断をしており、AWSが推奨するパターンに沿っていると言える。

---

## 分割基準の判断フレームワーク

Lambda をどう分割するかを決める際、以下の 3 つの軸で判断できる。

### 軸 1: ロール別分割

WebSocket のライフサイクルイベントに基づく分割。

```
接続管理ロール:  $connect / $disconnect → 接続の確立・切断処理
ゲームロジックロール: $default → ゲーム進行に関する全アクション
```

- **最も基本的な分割**。WebSocket API Gateway が標準でサポートするルートに対応する
- 接続管理とビジネスロジックの責務を分離できる
- **本プロジェクトおよび Simple Trivia Service が採用しているパターン**

### 軸 2: アクション別分割

ビジネスアクション単位での分割。

```
join      → JoinFn
draw_card → DrawCardFn
get_state → GetStateFn
```

- 各アクションが完全に独立している場合に有効
- アクション間の共有状態やコードが多い場合はオーバーヘッドが大きい
- **アクション数が 10 以上になるような大規模ゲーム向き**

### 軸 3: 同期/非同期分割

レスポンスの即時性に基づく分割。

```
同期処理（即時応答が必要）: join, draw_card, get_state → Lambda
非同期処理（遅延許容）:     ランキング計算, 統計集計   → Lambda + SQS/Step Functions
```

- リアルタイム応答が必要な処理と、バックグラウンドで実行できる処理を分離
- **ゲームが成長して分析・統計機能が追加された場合に検討する軸**

### 判断フローチャート

```
アクション数は 10 以上か？
  ├── YES → アクション別分割を検討
  └── NO
       ├── チーム数は 3 以上か？
       │    ├── YES → ドメイン別分割を検討
       │    └── NO → ロール別分割で十分
       └── 非同期処理が必要か？
            ├── YES → 同期/非同期で分割
            └── NO → ロール別分割で十分
```

---

## 本プロジェクトへの適用と結論

### 現状の評価

本プロジェクトの現行構成（ロール別 3 Lambda）は、以下の理由から**適切な選択**である。

1. **アクション数が少ない（3 種類）**: join, draw_card, get_state の 3 アクションであり、アクション別分割するメリットが薄い
2. **少人数開発**: 管理する Lambda が少ないほど運用負荷が低い
3. **コールドスタートの最小化**: `$default` に全メッセージが集中するため、ウォーム状態が維持されやすい
4. **AWS 公式リファレンスと一致**: Simple Trivia Service と同じパターンであり、実績のある構成
5. **Clean Architecture による内部分離**: Lambda は分割していないが、ユースケース層で責務が分離されており、将来の分割にも対応しやすい

### 将来分割が必要になるタイミング

以下のシグナルが出たら、分割を検討する。

| シグナル | 対応 |
|---------|------|
| `$default` Lambda のパッケージサイズが 50MB を超えた | アクション別分割 |
| 特定アクションの処理時間が他を圧迫している | そのアクションを別 Lambda に分離 |
| チームが 3 つ以上になった | ドメイン別に Lambda を分割 |
| 非同期処理（ランキング集計等）が追加された | 同期/非同期で分割 + SQS/Step Functions 導入 |
| 特定アクションに異なる IAM 権限が必要になった | そのアクションを別 Lambda に分離 |

### 結論

> **現時点ではロール別 3 Lambda 構成を維持し、Clean Architecture によるユースケース層の分離で将来の変更に備える。**

Lambda の分割はコードレベルではなくインフラレベルの関心事であり、Clean Architecture を採用している本プロジェクトでは、ユースケースやリポジトリの差し替えだけで Lambda の分割・統合に対応できる。つまり、「今は分割しない」という判断をしても、将来のコスト（分割時の手戻り）は最小限に抑えられている。

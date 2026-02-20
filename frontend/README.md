# Rakko フロントエンド

ババ抜きゲームのフロントエンド実装です。

## 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| 言語 | TypeScript 5 |

## 起動方法

```bash
npm install
npm run dev
```

`http://localhost:3000/babanuki` でゲームが起動します。

---

## ファイル構成

```
src/
├── app/
│   ├── page.tsx                          # ホーム（/babanuki へのリンク）
│   ├── layout.tsx                        # ルートレイアウト
│   └── babanuki/
│       └── page.tsx                      # ゲームのメインページ（フェーズ管理）
│
└── features/babanuki/                    # babanuki 機能モジュール
    ├── index.ts                          # public API（外部へのexport窓口）
    ├── components/
    │   ├── TitleScreen.tsx               # タイトル画面
    │   ├── WaitingScreen.tsx             # 待機画面（テーマルーレット）
    │   ├── GeneratingScreen.tsx          # AI生成中画面
    │   ├── PlayScreen.tsx                # プレイ画面
    │   └── ResultScreen.tsx              # 結果画面
    ├── lib/
    │   ├── types.ts                      # 型定義
    │   └── engine.ts                     # ゲームロジック
    └── services/
        ├── imageGeneration.ts            # 切り替え口（1行変更で本実装に移行）
        └── imageGeneration.mock.ts       # モック実装（即時空文字を返す）
```

`app/babanuki/page.tsx` は `@/features/babanuki` の public API（`index.ts`）のみをimportします。

---

## ゲームフロー

```
title → waiting → generating → playing → result
                                            ↓
                                        title（再対戦）
```

### フェーズ詳細

| フェーズ | 画面 | 説明 |
|---|---|---|
| `title` | TitleScreen | スタートボタン、ルール説明 |
| `waiting` | WaitingScreen | プレイヤー参加待ち + テーマルーレット |
| `generating` | GeneratingScreen | AI背景画像生成中 |
| `playing` | PlayScreen | ゲーム本体 |
| `result` | ResultScreen | 勝者表示 |

フェーズ管理は `app/babanuki/page.tsx` の `useState<GamePhase>` で行っています。

---

## ゲームロジック（`features/babanuki/lib/engine.ts`）

### デッキ

- 52枚（スペード・ハート・ダイヤ・クラブ × 1〜K）+ ジョーカー1枚 = 計53枚
- `createDeck()` で生成、`shuffle()` でフィッシャー-イェーツシャッフル

### ゲーム開始

1. `dealCards()` でプレイヤー4人に全カードを配る
2. `removePairs()` で各プレイヤーの初期手札からペアを除去

### ターン進行

- `getDrawTarget()` で現在のプレイヤーが引く相手を決定（反時計回りで次のアクティブプレイヤー）
- `drawCard()` でカードを1枚引き、ペアになれば自動で捨てる
- `getNextActivePlayer()` で手札が残っている次のプレイヤーへ移行

### 終了判定

- `isGameOver()`: 誰かが初めて手札0枚になった瞬間にゲーム終了
- `getWinner()`: `finishedOrder === 1` のプレイヤーが優勝

---

## テーマルーレット（`WaitingScreen.tsx`）

プレイヤーが1人参加するたびにスロットが1段ずつ確定します。

| 参加順 | 確定するスロット |
|---|---|
| 1人目（あなた） | だれが |
| 2人目 | いつ |
| 3人目 | どこで |
| 4人目 | なにを |

4人全員が揃い、4スロットすべて確定したら「このテーマで始める」ボタンが出現します。

---

## CPUプレイヤー

現在は3体のCPUがモックで参加します（`app/babanuki/page.tsx` のタイマー）。

| ID | 名前 | アバター | 参加タイミング |
|---|---|---|---|
| human | あなた | 😊 | 0.5秒後 |
| cpu1 | Aさん | 🐱 | 3秒後 |
| cpu2 | Bさん | 🐶 | 5.5秒後 |
| cpu3 | Cさん | 🐰 | 8秒後 |

CPUのカード選択は `cpuChooseCard()` によるランダム選択です。

---

## AI背景画像生成

`features/babanuki/services/imageGeneration.ts` で実装を切り替えます。

```
services/
├── imageGeneration.ts        # TODO: 本番時は re-export 先を .real に変更
├── imageGeneration.mock.ts   # モック（即時空文字を返す）
└── imageGeneration.real.ts   # 本実装（未作成）
```

### データフロー

```
GeneratingScreen
  → generateBackgroundImage(theme)  // services/imageGeneration.ts を呼ぶ
  → onComplete(imageUrl)
      → page.tsx が backgroundImage state に保存
          → PlayScreen に backgroundImage prop として渡す
```

### バックエンド接続時の変更箇所

1. **`services/imageGeneration.real.ts`** を作成し、実際のAPI呼び出しを実装
2. **`services/imageGeneration.ts`** の1行を `.mock` → `.real` に変更するだけ

---

## マルチプレイへの移行

現状はすべてクライアントサイドで完結していますが、以下を差し替えることでマルチプレイに対応できます。

| 現状 | マルチプレイ後 |
|---|---|
| `page.tsx` の `useState` でゲーム状態管理 | WebSocket でサーバーと同期 |
| `setTimeout` でCPU参加をシミュレート | サーバーから参加イベントを受信 |
| `engine.ts` でクライアントがターンを処理 | サーバーの処理結果をstateに適用するだけ |

UIコンポーネント（各画面、カード表示）と型定義はそのまま再利用可能です。

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
│   ├── page.tsx                    # ホーム（/babanuki へのリンク）
│   ├── layout.tsx                  # ルートレイアウト
│   └── babanuki/
│       └── page.tsx                # ゲームのメインページ（フェーズ管理）
│
├── components/babanuki/
│   ├── TitleScreen.tsx             # タイトル画面
│   ├── WaitingScreen.tsx           # 待機画面（テーマルーレット）
│   ├── GeneratingScreen.tsx        # AI生成中画面（モック）
│   ├── PlayScreen.tsx              # プレイ画面
│   └── ResultScreen.tsx            # 結果画面
│
└── lib/babanuki/
    ├── types.ts                    # 型定義
    └── engine.ts                   # ゲームロジック
```

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
| `generating` | GeneratingScreen | AI背景画像生成中（現在はモック） |
| `playing` | PlayScreen | ゲーム本体 |
| `result` | ResultScreen | 勝者表示 |

フェーズ管理は `app/babanuki/page.tsx` の `useState<GamePhase>` で行っています。

---

## ゲームロジック（`lib/babanuki/engine.ts`）

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

## AI背景画像生成（現在はモック）

`GeneratingScreen` はプログレスバーのアニメーションのみで、実際の生成は行っていません。

### バックエンド接続時の変更箇所

1. **`GeneratingScreen.tsx`** — `onComplete()` → `onComplete(imageUrl: string)` に変更し、API呼び出しを追加
2. **`app/babanuki/page.tsx`** — `backgroundImage` stateを追加し、`PlayScreen` に渡す
3. **`PlayScreen.tsx`** — `backgroundImage?: string` propを受け取り、CSSグラデーションの代わりに使用

---

## マルチプレイへの移行

現状はすべてクライアントサイドで完結していますが、以下を差し替えることでマルチプレイに対応できます。

| 現状 | マルチプレイ後 |
|---|---|
| `page.tsx` の `useState` でゲーム状態管理 | WebSocket でサーバーと同期 |
| `setTimeout` でCPU参加をシミュレート | サーバーから参加イベントを受信 |
| `engine.ts` でクライアントがターンを処理 | サーバーの処理結果をstateに適用するだけ |

UIコンポーネント（各画面、カード表示）と型定義はそのまま再利用可能です。

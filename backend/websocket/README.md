# WebSocket CDK Stack

WebSocket API用のCDKプロジェクトです。デプロイ先: **東京リージョン (ap-northeast-1)**

## デプロイ手順

### 初回デプロイ

```bash
# 1. 依存関係のインストール
npm install

# 2. ブートストラップ（初回のみ、アカウント+リージョンごとに1回）
cdk bootstrap --profile your-profile-name

# 3. デプロイ
cdk deploy --profile your-profile-name
```

### 2回目以降

```bash
cdk deploy --profile your-profile-name
```

## コマンド説明

| コマンド | 説明 | 実行タイミング |
|---------|------|--------------|
| `cdk bootstrap` | CDK実行環境をセットアップ（S3バケット、IAMロール等を作成） | 初回のみ |
| `cdk synth` | CloudFormationテンプレートに変換して内容確認 | 任意 |
| `cdk deploy` | AWSリソースを作成・更新 | デプロイ時 |
| `cdk diff` | デプロイ済みスタックとの差分確認 | デプロイ前 |
| `cdk destroy` | スタックを削除 | 削除時 |

## プロファイル指定方法

### 方法1: コマンドラインオプション（推奨）
```bash
cdk deploy --profile your-profile-name
```

### 方法2: 環境変数
```bash
export AWS_PROFILE=your-profile-name
cdk deploy
```

## 開発用コマンド

* `npm run build`   TypeScriptをコンパイル
* `npm run watch`   ファイル変更を監視して自動コンパイル
* `npm run test`    Jestテストを実行

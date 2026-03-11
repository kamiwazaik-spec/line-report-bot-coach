# line-report-bot-coach

撮影チーム向けLINE報告ボット + AIコーチング + Addness MCP連携

## ファイル構成

```
line-report-bot-coach/
├── api/
│   ├── webhook.js          # LINE Webhook
│   └── cron.js             # 日次自動レポート（毎日21:00 JST）
├── src/
│   ├── google-sheets/
│   │   └── index.js        # Googleスプレッドシート連携
│   └── messages/
│       ├── index.js        # メッセージ生成・分割ロジック
│       └── members.js      # メンバー別コーチング
├── addness-mcp-server/     # Addness MCP Server
│   ├── index.js
│   ├── addness-api.js
│   └── package.json
├── vercel.json
├── package.json
└── .env.example
```

## セットアップ手順

### 1. 環境変数の設定（Vercelダッシュボードで設定）

| 変数名 | 説明 |
|--------|------|
| LINE_CHANNEL_ACCESS_TOKEN | LINEチャンネルアクセストークン |
| LINE_CHANNEL_SECRET | LINEチャンネルシークレット |
| LINE_GROUP_ID | 送信先LINEグループID |
| CRON_SECRET | Cronジョブの認証キー（任意の文字列） |
| GOOGLE_SERVICE_ACCOUNT_EMAIL | Googleサービスアカウントのメール |
| GOOGLE_PRIVATE_KEY | Googleサービスアカウントの秘密鍵 |
| SPREADSHEET_ID | GoogleスプレッドシートのID |

### 2. Vercelにデプロイ

```bash
# GitHubにプッシュ後、Vercelと連携するだけ
vercel --prod
```

### 3. LINEボットのWebhook URL設定

LINE Developersコンソールで：
```
https://your-app.vercel.app/api/webhook
```

### 4. Cronジョブの確認

Vercelダッシュボード → Functions → Cron Jobs で
`/api/cron` が毎日21:00に実行されることを確認

## LINEで使えるコマンド

| コマンド | 説明 |
|--------|------|
| `報告` | 個別コーチングメッセージを受信 |
| `全体` | チーム全体のサマリーを表示 |
| `サマリー` | チーム全体のサマリーを表示 |

## Addness MCP Server

GenSpark・ChatGPTからAddnessのタスク管理を操作できます。

### セットアップ

```bash
cd addness-mcp-server
npm install
cp .env.example .env
# .envにAddnessのセッションCookieを設定
```

### GenSparkへの登録

GenSparkの設定 → MCP → 以下を追加：

```json
{
  "command": "node",
  "args": ["/path/to/addness-mcp-server/index.js"]
}
```

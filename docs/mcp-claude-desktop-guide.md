# Claude Desktop 連携ガイド (MCP Stdio Bridge)

本ガイドでは、Personal Portal の MCP JSON-RPC エンドポイント（`/api/mcp`）を、標準入出力 (Stdio) を用いて Claude Desktop などのデスクトップAIクライアントに接続・連携する手順を解説します。

- **仕様書:** [Spec 009: MCP 対話型テスト実行環境と Stdio ブリッジ](../specs/active/009-mcp-interactive-runner-and-stdio-bridge.md)
- **設計判断 (ADR):** [ADR 0007: MCP 対話型テスト実行環境と Stdio ブリッジの採用](adr/0007-mcp-interactive-runner-and-stdio-bridge.md)

---

## 1. 概要 (Overview)

Next.js で構築された Personal Portal の MCP サーバーは HTTP POST（`/api/mcp`）でリクエストを受け付けます。
一方、Claude Desktop はクライアントプロセスの標準入出力（Stdio）を介して JSON-RPC 通信を行う仕様になっています。

リポジトリ直下の `scripts/mcp-bridge.mjs` は、Node.js 標準機能のみを使用したゼロ依存のアダプターであり、Stdio と HTTP 間を仲介します。

```text
Claude Desktop (Stdio)
      ▲
      │ stdin / stdout (JSON-RPC)
      ▼
node scripts/mcp-bridge.mjs
      ▲
      │ HTTP POST (http://localhost:3000/api/mcp)
      ▼
Personal Portal (Next.js)
```

---

## 2. Claude Desktop への登録手順

### ステップ 1: 設定ファイルの場所を開く

Claude Desktop の設定ファイル `claude_desktop_config.json` をテキストエディタで開きます。

- **macOS:**
  `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:**
  `%APPDATA%\Claude\claude_desktop_config.json`

### ステップ 2: MCP サーバー設定を追記する

`mcpServers` ブロックに `personal-portal` を追加します。
※ `/ABSOLUTE/PATH/TO/personal-portal-agentic` は、ご自身のローカル環境のプロジェクト絶対パスに置き換えてください。

```json
{
  "mcpServers": {
    "personal-portal": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/personal-portal-agentic/scripts/mcp-bridge.mjs"
      ],
      "env": {
        "PORTAL_URL": "http://localhost:3000"
      }
    }
  }
}
```

> **Note:** ポータルを別のポートや本番URLで動かしている場合は、`PORTAL_URL` 環境変数（例: `http://localhost:3001`）を変更してください。

### ステップ 3: ポータル起動と Claude Desktop の再起動

1. ポータルの開発サーバーを起動しておきます。
   ```bash
   npm run dev
   ```
2. Claude Desktop アプリを完全に終了し、再起動します。
3. チャット画面の入力欄右下にあるツールアイコン（ハンマーマーク）に、以下の3つのツールが表示されていれば連携成功です：
   - `get_daily_briefing`
   - `search_knowledge_notes`
   - `create_portal_task`

---

## 3. コマンドラインでの動作確認

ポータルの開発サーバーが起動している状態で、ターミナルから直接動作確認を行えます。

### ツール一覧の取得 (`tools/list`)
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node scripts/mcp-bridge.mjs
```

**期待される出力例:**
```json
{"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"get_daily_briefing",...},{"name":"search_knowledge_notes",...},{"name":"create_portal_task",...}]}}
```

### ナレッジノートの検索 (`tools/call`: `search_knowledge_notes`)
```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_knowledge_notes","arguments":{"query":"Next.js"}}}' | node scripts/mcp-bridge.mjs
```

### デイリーブリーフィングの取得 (`tools/call`: `get_daily_briefing`)
```bash
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_daily_briefing","arguments":{"maxChars":500}}}' | node scripts/mcp-bridge.mjs
```

### ポータルタスクの作成 (`tools/call`: `create_portal_task`)
```bash
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"create_portal_task","arguments":{"title":"Claude Desktopから作成したタスク","priority":"high"}}}' | node scripts/mcp-bridge.mjs
```

---

## 4. トラブルシューティング

- **Bridge connection failed エラーが出る場合:**
  ポータル（`npm run dev`）が起動していないか、指定した `PORTAL_URL` が誤っています。ポータルがブラウザで `http://localhost:3000` で開けるか確認してください。
- **Claude Desktop 側でツールが表示されない場合:**
  `claude_desktop_config.json` 内のパスに誤りがないか確認し、Claude Desktop のログファイル（`~/Library/Logs/Claude/mcp*.log`）を確認してください。

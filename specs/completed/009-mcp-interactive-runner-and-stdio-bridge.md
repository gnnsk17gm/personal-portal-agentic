# Spec 009: MCP 対話型テスト実行環境（Interactive Runner）と Stdio ブリッジの実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. `/agent` 画面において、公開されている3つの MCP ツール（`get_daily_briefing`, `search_knowledge_notes`, `create_portal_task`）をブラウザ上から直接フォーム入力してテスト実行し、リクエストとレスポンスの JSON を確認できる対話型UI（Interactive Runner）を提供するため。
  2. Claude Desktop 等の標準入出力（Stdio）を要求する MCP クライアントと、Next.js の HTTP JSON-RPC エンドポイント（`/api/mcp`）を中継するゼロ依存のブリッジスクリプト（`scripts/mcp-bridge.mjs`）を用意するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0007-mcp-interactive-runner-and-stdio-bridge.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **MCP Interactive Runner UI (`/agent`):**
  - `/agent` 画面内の各ツールカード（または統合テストセクション）に「テスト実行フォーム」が用意されていること。
  - ツールごとに必要な引数（例: `search_knowledge_notes` のクエリ文字、`create_portal_task` のタイトルや優先度）を入力して「実行 (Execute)」ボタンを押せること。
  - 実行結果（ステータスコード、レスポンス JSON、エラー時のエラーメッセージ）がシンタックスハイライト風の `<pre>` 枠に表示されること。
  - タスク作成ツールを実行した場合、ダッシュボードや `/tasks` に即座に反映されること（または成功メッセージが表示されること）。
- [ ] **Stdio-to-HTTP ブリッジスクリプト (`scripts/mcp-bridge.mjs`):**
  - Node.js 標準モジュール（`readline`, `fetch`）のみを使用し、外部パッケージを追加しないこと。
  - 標準入力から1行ずつ JSON-RPC リクエストを受け取り、`http://localhost:3000/api/mcp` に POST 転送して、レスポンスを標準出力に1行の JSON として出力すること。
  - `PORTAL_URL` 環境変数（デフォルト: `http://localhost:3000`）で接続先を変更できること。
- [ ] **ドキュメント (`docs/`):**
  - Claude Desktop の設定ファイル（`claude_desktop_config.json`）に本ブリッジを登録するための設定例スニペットが `docs/mcp-claude-desktop-guide.md` 等に記載されていること。
- [ ] **品質ゲート:**
  - `npm run verify`（ESLint + TypeCheck + Vitest）がすべてエラーなしで Green であること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- なし（ブラウザからの `fetch`、および Node.js 標準 `readline` で完結）。

### 3.2 作成・変更予定ファイル
- `src/components/agent/McpInteractiveRunner.tsx` (新規: クライアントコンポーネントとしての対話型実行UI)
- `src/components/agent/McpToolsRegistry.tsx` (変更: 各ツールカードまたは下部セクションに Runner を組み込み)
- `scripts/mcp-bridge.mjs` (新規: Stdio-to-HTTP ブリッジスクリプト)
- `docs/mcp-claude-desktop-guide.md` (新規: Claude Desktop 連携手順と設定例)

## 4. 検証手順 (Verification Steps)
1. `npm run verify` がすべてエラーなしでパスすること。
2. ブラウザで `/agent` を開き、`search_knowledge_notes` のテスト実行フォームに `Next.js` と入力して実行し、レスポンス JSON に検索結果が返ってくることを確認。
3. 開発サーバー起動中に別ターミナルで `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node scripts/mcp-bridge.mjs` を実行し、標準出力に正しい JSON レスポンスが1行で返ってくることを確認。

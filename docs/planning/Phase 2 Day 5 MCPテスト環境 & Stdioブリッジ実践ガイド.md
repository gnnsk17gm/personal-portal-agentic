# Phase 2 / Day 5: MCP Interactive Runner と Stdio ブリッジの実装（Spec 009 & ADR 0007）

Phase 2 Day 4 で、ポータル内部のビジネスロジックを外部エージェント向けに開放する **MCP（Model Context Protocol）エンドポイント（`/api/mcp`）** が完成しました。

Phase 2 の締めくくりとなる Day 5 では、この MCP 基盤を **「面接で誰にでも一瞬でデモできる形」** に仕上げます。

1. **MCP Interactive Runner（画面上での対話型ツール実行UI）:** `/agent` 画面から、公開中の3つの MCP ツール（朝の要約、BM25検索、タスク作成）に引数を入力してワンクリックで実行し、生の JSON-RPC リクエスト / レスポンスをリアルタイムに観察できるテスト環境。  
2. **ローカル Stdio-to-HTTP ブリッジスクリプト:** Claude Desktop や Cursor 等のローカルデスクトップAIが標準入出力（Stdio）経由でポータルの `/api/mcp` を直接ツールとして呼び出せる軽量スクリプト（外部課金0円）。

---

## 1\. なぜこれが転職ポートフォリオで決定打になるのか？

「APIを作りました」と言っても、採用担当者に `curl` コマンドを叩かせるのはハードルが高いです。

しかし、`/agent` 画面を開いて **「このように画面上で引数を変えて即座に JSON-RPC のリクエストとレスポンスをテストでき、さらにローカルの Claude Desktop にも設定ファイル1行で連携できます」** と実演できれば、プロトコル設計から開発者体験（DX）、運用性までを考慮できるエンジニアとして強烈な印象を残せます。

もちろん、**外部の有料API契約や課金は一切不要（0円）** です。

---

## 2\. 到達目標（Definition of Done）

- [ ] Day 4 の仕様書（`008`）が `specs/completed/` に移動され、コミット済みであることを確認する  
- [ ] テスト環境とStdioブリッジの設計判断を記した `docs/adr/0007-mcp-interactive-runner-and-stdio-bridge.md` を作成する  
- [ ] 仕様書 `specs/active/009-mcp-interactive-runner-and-stdio-bridge.md` を作成する  
- [ ] Antigravity に Implementation Plan を出力させ、レビュー・承認する  
- [ ] `npm run verify`（全テストGreen）をパスさせ、ブラウザとターミナルの両方で MCP ツールの動作を確認する

---

## 3\. 意思決定の記録：ADR 0007 の作成

### File 1: `docs/adr/0007-mcp-interactive-runner-and-stdio-bridge.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0007: MCP 対話型テスト実行環境（Interactive Runner）と Stdio ブリッジの採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-06
- **決定者:** Project Architect

## 1. コンテキスト (Context)
Spec 008 で構築した MCP JSON-RPC エンドポイント（`/api/mcp`）は正常稼働しているが、以下の課題がある：
1. **動作確認・デモの容易性（Observability）:** 動作確認に `curl` を使う必要があり、採用面接の場やブラウザ単体で手軽に挙動やエラーハンドリングを実演できない。
2. **Stdio クライアントとの互換性:** Claude Desktop などのデスクトップAIクライアントは、HTTP ではなく標準入出力（Stdio）で MCP サーバーと通信する仕様が標準であるため、HTTP エンドポイントを叩くアダプターが必要。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: 外部の MCP GUI ツール（MCP Inspector 等）の利用を前提とする**
  - 別途 Node プロセスを立てる必要があり、ポータル単体で完結しない。
- **Option 2: ポータル内の `/agent` 画面に「MCP Interactive Runner」を内製し、リポジトリ内にゼロ依存の Stdio ブリッジスクリプト（`scripts/mcp-bridge.mjs`）を同梱する**
  - Web画面上で即座にインタラクティブなテストが可能になり、かつ Claude Desktop の `claude_desktop_config.json` から `node scripts/mcp-bridge.mjs` で即座に繋がる。

## 3. 決定内容 (Decision)
**Option 2（Web内製テストUI + 軽量Stdioブリッジスクリプト）を採用する。**

### 選定理由:
1. **圧倒的なデモ再現性:**
   - 面接時にブラウザ1画面を開くだけで、エージェント定義（Rules/Skills）と公開ツール、そしてツールの実機実行結果（JSON）をワンストップで見せられる。
2. **外部課金ゼロ・依存ゼロの維持:**
   - ブリッジスクリプトは Node.js 標準の `readline` と `fetch` だけで記述し、余計なライブラリを一切インストールしない。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - `/agent` 画面が真の「AIエージェント統合開発コンソール」へと完成する。
  - 外部のデスクトップエージェントから本ポータルのデータベースを直接操作できるようになる。
- **トレードオフ (Negative):**
  - 対話型UIのため、`/agent` のコンポーネントに最小限の Client Component（フォーム入力・実行状態管理）が含まれる。
```

&nbsp;

---

## 4\. MCPテスト環境とブリッジの仕様書（Spec 009）

### File 2: `specs/active/009-mcp-interactive-runner-and-stdio-bridge.md`

以下の内容でファイルを作成してください。

```markdown
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
```

&nbsp;

---

## 5\. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0007-mcp-interactive-runner-and-stdio-bridge.md` と `specs/active/009-mcp-interactive-runner-and-stdio-bridge.md`）を作成・保存したら、Antigravity に以下の指示プロンプトを送信してください。

### 💬 エージェントへの指示プロンプト（コピペ用）

```
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0007-mcp-interactive-runner-and-stdio-bridge.md の設計判断を踏まえた上で、
@specs/active/009-mcp-interactive-runner-and-stdio-bridge.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
```

&nbsp;
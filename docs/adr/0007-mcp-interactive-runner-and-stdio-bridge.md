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

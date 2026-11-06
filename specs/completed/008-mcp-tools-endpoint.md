# Spec 008: Model Context Protocol (MCP) エンドポイントと公開ツールの実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. 外部のAIエージェント（Antigravity、Claude Desktop、LLMクライアント）が、本ポータルのデータやRAG検索機能を標準的なツール（Function Calling）として自律利用できるようにするため。
  2. 業界標準プロトコル「Model Context Protocol (MCP)」のコア仕様（`tools/list`, `tools/call`）に準拠した JSON-RPC 2.0 エンドポイント（`/api/mcp`）を構築するため。
  3. `/agent`（Context Inspector）画面に、現在エージェント向けに公開されているMCPツール群のメタデータとJSON Schemaを可視化するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0006-model-context-protocol-server.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **MCP ツール定義 (`src/services/mcpService.ts`):**
  以下の3つのツールが MCP 規格の JSON Schema（Name, Description, InputSchema）で定義されていること：
  1. `get_daily_briefing`: トークン予算（オプション）を受け取り、動的コンテキストペイロード（Markdown）とサマリーを返す（`assembleContext` を呼び出し）。
  2. `search_knowledge_notes`: 検索クエリ文字列を受け取り、BM25スコアリング上位のノート一覧を返す（`searchNotes` を呼び出し）。
  3. `create_portal_task`: タイトル（必須）、優先度（任意）、期日（任意）を受け取り、新規タスクを作成する（`createTask` を呼び出し）。
- [ ] **HTTP JSON-RPC 2.0 エンドポイント (`src/app/api/mcp/route.ts`):**
  - `POST /api/mcp` で JSON-RPC 2.0 リクエスト（`jsonrpc: "2.0"`）を受け付けること。
  - メソッド `tools/list` に対して、登録された全ツールのスキーマ定義一覧を返すこと。
  - メソッド `tools/call`（引数: `name`, `arguments`）に対して、該当のサービス関数を実行し、結果を `{ content: [{ type: "text", text: string }] }` のMCP標準フォーマットで返すこと。
  - 不正なリクエスト（存在しないツール名、引数バリデーションエラー、構文エラー）に対して、JSON-RPC 標準エラーコード（-32600, -32601, -32602 等）を返すこと。
- [ ] **`/agent` 画面への MCP ツール可視化セクション追加:**
  - `/agent` 画面に「MCP Tools Registry」セクションを追加し、現在公開されているツール名、説明文、入力スキーマ（引数一覧）をカード形式で美しく表示すること。
- [ ] **単体テストと品質ゲート:**
  - `src/services/__tests__/mcpService.test.ts` が追加され、`tools/list` のスキーマ整合性、各ツールの呼び出し結果、バリデーションエラー処理のテストがすべてパスすること。
  - `npm run verify` がすべて Green であること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- なし（純粋な TypeScript と Next.js 標準の `NextResponse` で構築）。

### 3.2 JSON-RPC 2.0 & MCP スキーマ型定義 (`src/types/mcp.ts`)
```typescript
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

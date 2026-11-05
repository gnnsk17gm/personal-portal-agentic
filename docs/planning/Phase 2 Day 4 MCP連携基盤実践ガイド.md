# Phase 2 / Day 4: Model Context Protocol (MCP) エンドポイントと公開ツールの実装（Spec 008 & ADR 0006）

Day 1〜3を通じて、**Dynamic Context Assembler（トークン予算制御）**、**自作BM25検索エンジン**、そして **タスク駆動型ローカルRAG** が完成しました。

Day 4では、このポータルをただのWebアプリにとどめず、**「外部のAIエージェント（Claude Desktop、Antigravity、Cursor、Cline等）が直接ツールとして呼び出せるMCPサーバー（Model Context Protocol Server）」** へと進化させます。

もちろん、外部課金や有料APIは一切不要（0円）で、オープン標準である JSON-RPC 2.0 / MCP 仕様に準拠した Route Handler を内製します。

---

## 1\. なぜ「自作MCPエンドポイント」が転職で最強の武器になるのか？

現在、AIエージェント業界で最も注目されているオープン規格が Anthropic の提唱した **Model Context Protocol (MCP)** です。

* **初級エンジニアのポートフォリオ:** 「AIに画面のボタンを押させて質問するチャット画面を作りました」  
* **あなた（本プロジェクト）のポートフォリオ:** 「ポータルの内部ビジネスロジック（RAG検索、タスク作成、朝の要約生成）を **MCP（Model Context Protocol）準拠のツール（Tools）として公開** しました。これにより、Claude Desktopや各種自律型エージェントから、ポータルの知識を安全にツールコール（Function Calling）させることができます」

面接官に対して **「業界標準プロトコル（MCP）の仕様を正確に理解し、RESTful APIの枠を超えたエージェント間通信のインターフェースを設計できる」** ことを決定的にアピールできます。

---

## 2\. Phase 2 / Day 4 の到達目標（Definition of Done）

- [ ] Day 3 の仕様書（`007`）が `specs/completed/` に移動され、コミット済みであることを確認する  
- [ ] MCP採用の設計根拠を記した `docs/adr/0006-model-context-protocol-server.md` を作成する  
- [ ] MCPツール公開の仕様書 `specs/active/008-mcp-tools-endpoint.md` を作成する  
- [ ] Antigravity に計画・テスト・実装を行わせる  
- [ ] Next.js の Route Handler（`/api/mcp`）経由で、JSON-RPC 2.0 ベースの `tools/list` および `tools/call` が動作することを確認する  
- [ ] `/agent` 画面に「公開中のMCPツール一覧（仕様スキーマ）」が可視化される

---

## 3\. 意思決定の記録：ADR 0006 の作成

### File 1: `docs/adr/0006-model-context-protocol-server.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0006: Model Context Protocol (MCP) 準拠のエージェント連携エンドポイントの採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-05
- **決定者:** Project Architect

## 1. コンテキスト (Context)
ポータル内に蓄積されたナレッジ（Second Brain）、タスク一覧、および動的コンテキスト（Context Assembler）は、ブラウザUIからだけでなく、ローカルやクラウド上で稼働するAIエージェント（Antigravity、Claude Desktop、Cursor等）からも直接参照・操作されることが望ましい。
しかし、独自仕様のREST APIを作ると、クライアントごとにツール呼び出し（Function Calling）のスキーマ定義やアダプターを個別実装する必要が生じる。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: 独自仕様の RESTful API (`POST /api/v1/tasks` 等)**
  - 実装は平易だが、AIエージェント側のツール定義（JSON Schema）を手動で登録・更新する必要があり汎用性に欠ける。
- **Option 2: Model Context Protocol (MCP) 準拠の JSON-RPC 2.0 エンドポイントの内製**
  - エージェント業界標準のプロトコルに準拠し、ツール定義（`tools/list`）と実行（`tools/call`）を標準化されたJSON Schemaで公開する。

## 3. 決定内容 (Decision)
**Option 2（MCP準拠の HTTP JSON-RPC 2.0 エンドポイント `/api/mcp` の内製）を採用する。**

### 選定理由:
1. **オープンスタンダード準拠による相互運用性:**
   - 業界標準のMCP仕様に準拠することで、将来的にClaude Desktopの `claude_desktop_config.json` や各種Agenticツールから設定1つで接続可能になる。
2. **既存Service層の再利用:**
   - Day 1〜3で構築した `assembleContext`, `searchNotes`, `createTask` をそのままツールハンドラーの実行関数としてマッピングできる。
3. **外部課金ゼロ（Pure TypeScript）:**
   - 外部MCPライブラリの重厚な依存を入れず、Next.js App RouterのRoute Handler上で純粋なJSON-RPCディスパッチャーを構築することで、軽量かつ100%テスト可能な環境を維持する。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - エージェントが自己記述的なJSON Schemaを参照して自律的にポータルの機能を呼び出せるようになる。
  - テスト容易性が極めて高く、Vitestで全ツール呼び出しの入出力を決定論的に検証できる。
- **トレードオフ (Negative):**
  - HTTP POSTによるJSON-RPCハンドリングのため、StdioベースのMCPクライアントに直接繋ぐには薄いHTTP-to-Stdioブリッジが必要（今後の拡張で対応可能）。
```

&nbsp;

---

## 4\. MCPツール公開の仕様書（Spec 008）

### File 2: `specs/active/008-mcp-tools-endpoint.md`

以下の内容でファイルを作成してください。

```markdown
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
```

&nbsp;

### 3.3 作成・変更予定ファイル

- `src/types/mcp.ts` (新規: MCP / JSON-RPC の型定義)  
- `src/services/mcpService.ts` (新規: ツールのレジストリとディスパッチャー、DI対応)  
- `src/services/__tests__/mcpService.test.ts` (新規: MCPツールの単体テスト)  
- `src/app/api/mcp/route.ts` (新規: Next.js Route Handler エンドポイント)  
- `src/app/agent/page.tsx` (変更: 公開中MCPツールの可視化カードを追加)

## 4\. 検証手順 (Verification Steps)

1. `npm run verify` がすべてエラーなしでパスすること。  
2. 開発サーバー起動中に `curl` で以下を送信し、正しい JSON-RPC レスポンスが返ることを確認：  
   - `curl -X POST http://localhost:3000/api/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`  
   - `curl -X POST http://localhost:3000/api/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_daily_briefing","arguments":{}}}'`  
3. ブラウザで `/agent` を開き、「MCP Tools Registry」が整然と表示されていることを確認。

````

---

## 5. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0006-model-context-protocol-server.md` と `specs/active/008-mcp-tools-endpoint.md`）を作成したら、Antigravity に以下の指示プロンプトを送信してください。

### 💬 エージェントへの指示プロンプト（コピペ用）

```text
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0006-model-context-protocol-server.md の設計判断を踏まえた上で、
@specs/active/008-mcp-tools-endpoint.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
````

&nbsp;
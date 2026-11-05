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

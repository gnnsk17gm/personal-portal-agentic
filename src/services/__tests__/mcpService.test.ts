import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import { createCapture } from '@/services/captureService';
import { handleJsonRpc, listTools, MCP_TOOLS } from '@/services/mcpService';
import { JSON_RPC_ERRORS } from '@/types/mcp';

describe('mcpService', () => {
  let db: AppDb;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('listTools / MCP_TOOLS schema integrity', () => {
    it('3つの主要ツールが正しく登録・定義されている', () => {
      const tools = listTools();
      expect(tools).toHaveLength(3);
      expect(tools).toEqual(MCP_TOOLS);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('get_daily_briefing');
      expect(toolNames).toContain('search_knowledge_notes');
      expect(toolNames).toContain('create_portal_task');

      const briefing = tools.find((t) => t.name === 'get_daily_briefing');
      expect(briefing?.inputSchema.type).toBe('object');
      expect(briefing?.inputSchema.properties.maxChars).toBeDefined();

      const search = tools.find((t) => t.name === 'search_knowledge_notes');
      expect(search?.inputSchema.required).toContain('query');
      expect(search?.inputSchema.properties.query).toBeDefined();

      const task = tools.find((t) => t.name === 'create_portal_task');
      expect(task?.inputSchema.required).toContain('title');
      expect(task?.inputSchema.properties.title).toBeDefined();
      expect(task?.inputSchema.properties.priority).toBeDefined();
      expect(task?.inputSchema.properties.dueDate).toBeDefined();
    });
  });

  describe('handleJsonRpc protocol dispatching', () => {
    it('不正なJSON-RPCリクエストには INVALID_REQUEST (-32600) を返す', async () => {
      const res = await handleJsonRpc({ foo: 'bar' }, { db });
      expect(res).not.toBeNull();
      expect(res?.error?.code).toBe(JSON_RPC_ERRORS.INVALID_REQUEST);
    });

    it('未知のメソッドには METHOD_NOT_FOUND (-32601) を返す', async () => {
      const res = await handleJsonRpc(
        { jsonrpc: '2.0', id: 1, method: 'non_existent_method' },
        { db }
      );
      expect(res?.id).toBe(1);
      expect(res?.error?.code).toBe(JSON_RPC_ERRORS.METHOD_NOT_FOUND);
    });

    it('通知（id未指定またはnull）はレスポンス不要としてnullを返す', async () => {
      const res = await handleJsonRpc(
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { db }
      );
      expect(res).toBeNull();
    });

    it('initialize メソッドをサポートし、プロトコル情報とケイパビリティを返す', async () => {
      const res = await handleJsonRpc(
        { jsonrpc: '2.0', id: 'init-1', method: 'initialize' },
        { db }
      );
      expect(res?.id).toBe('init-1');
      expect(res?.error).toBeUndefined();
      expect((res?.result as { serverInfo: { name: string } })?.serverInfo?.name).toBe('personal-portal-mcp');
    });

    it('ping メソッドに応答する', async () => {
      const res = await handleJsonRpc(
        { jsonrpc: '2.0', id: 2, method: 'ping' },
        { db }
      );
      expect(res?.id).toBe(2);
      expect(res?.result).toEqual({});
    });

    it('tools/list でツール一覧を返す', async () => {
      const res = await handleJsonRpc(
        { jsonrpc: '2.0', id: 'tools-1', method: 'tools/list' },
        { db }
      );
      expect(res?.id).toBe('tools-1');
      expect(res?.error).toBeUndefined();
      const result = res?.result as { tools: unknown[] };
      expect(result.tools).toHaveLength(3);
    });
  });

  describe('tools/call execution', () => {
    it('存在しないツール呼び出しには METHOD_NOT_FOUND (-32601) を返す', async () => {
      const res = await handleJsonRpc(
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'unknown_tool', arguments: {} },
        },
        { db }
      );
      expect(res?.error?.code).toBe(JSON_RPC_ERRORS.METHOD_NOT_FOUND);
    });

    it('引数がオブジェクトでない場合は INVALID_PARAMS (-32602) を返す', async () => {
      const res = await handleJsonRpc(
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: { name: 'get_daily_briefing', arguments: 'invalid' },
        },
        { db }
      );
      expect(res?.error?.code).toBe(JSON_RPC_ERRORS.INVALID_PARAMS);
    });

    it('get_daily_briefing を実行してサマリーとMarkdownペイロードを返す', async () => {
      const res = await handleJsonRpc(
        {
          jsonrpc: '2.0',
          id: 'briefing-1',
          method: 'tools/call',
          params: { name: 'get_daily_briefing', arguments: { maxChars: 800 } },
        },
        { db }
      );
      expect(res?.id).toBe('briefing-1');
      expect(res?.error).toBeUndefined();

      const result = res?.result as { content: [{ type: string; text: string }] };
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('# Personal Portal Context');
      expect(result.content[0].text).toContain('未完了タスク');
    });

    it('search_knowledge_notes でノートをBM25検索できる', async () => {
      createCapture('React と Next.js の設計について', db);
      createCapture('週次ミーティングのメモ', db);

      const res = await handleJsonRpc(
        {
          jsonrpc: '2.0',
          id: 'search-1',
          method: 'tools/call',
          params: { name: 'search_knowledge_notes', arguments: { query: 'Next.js' } },
        },
        { db }
      );
      expect(res?.error).toBeUndefined();
      const result = res?.result as { content: [{ type: string; text: string }] };
      expect(result.content[0].type).toBe('text');
      const parsedNotes = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsedNotes)).toBe(true);
      expect(parsedNotes.length).toBeGreaterThan(0);
      expect(parsedNotes[0].content).toContain('Next.js');
    });

    it('search_knowledge_notes に空または空白クエリが渡された場合は INVALID_PARAMS (-32602) を返す', async () => {
      const res = await handleJsonRpc(
        {
          jsonrpc: '2.0',
          id: 'search-err',
          method: 'tools/call',
          params: { name: 'search_knowledge_notes', arguments: { query: '   ' } },
        },
        { db }
      );
      expect(res?.error?.code).toBe(JSON_RPC_ERRORS.INVALID_PARAMS);
    });

    it('create_portal_task で新規タスクを作成し、作成結果JSONを返す', async () => {
      const res = await handleJsonRpc(
        {
          jsonrpc: '2.0',
          id: 'task-1',
          method: 'tools/call',
          params: {
            name: 'create_portal_task',
            arguments: {
              title: 'Agentから追加されたタスク',
              priority: 'high',
              dueDate: '2026-12-31',
            },
          },
        },
        { db }
      );
      expect(res?.error).toBeUndefined();
      const result = res?.result as { content: [{ type: string; text: string }] };
      expect(result.content[0].type).toBe('text');
      const createdTask = JSON.parse(result.content[0].text);
      expect(createdTask.title).toBe('Agentから追加されたタスク');
      expect(createdTask.priority).toBe('high');
      expect(createdTask.dueDate).toBe('2026-12-31');
    });

    it('create_portal_task の業務バリデーションエラー（タイトル空や不正日付等）は isError: true で返す', async () => {
      const res = await handleJsonRpc(
        {
          jsonrpc: '2.0',
          id: 'task-err-1',
          method: 'tools/call',
          params: {
            name: 'create_portal_task',
            arguments: {
              title: 'タイトル',
              dueDate: 'invalid-date',
            },
          },
        },
        { db }
      );
      expect(res?.error).toBeUndefined(); // JSON-RPCエラーではなくMCPツールエラー
      const result = res?.result as { content: [{ type: string; text: string }]; isError?: boolean };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('期限日は YYYY-MM-DD 形式で指定してください');
    });
  });
});

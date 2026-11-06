import { describe, expect, it } from 'vitest';
import {
  buildToolsCallPayload,
  parseRunnerFormValues,
} from '@/lib/mcpRunner';
import type { McpToolDefinition } from '@/types/mcp';

describe('mcpRunner', () => {
  const sampleTool: McpToolDefinition = {
    name: 'create_portal_task',
    description: 'タスク作成',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'タイトル' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        dueDate: { type: 'string' },
      },
      required: ['title'],
    },
  };

  const numberTool: McpToolDefinition = {
    name: 'get_daily_briefing',
    description: 'ブリーフィング取得',
    inputSchema: {
      type: 'object',
      properties: {
        maxChars: { type: 'number', description: '最大文字数' },
      },
    },
  };

  describe('parseRunnerFormValues', () => {
    it('空文字や未入力の項目を除外し、number型を正しくパースする', () => {
      const parsed = parseRunnerFormValues(numberTool, {
        maxChars: '2000',
      });
      expect(parsed).toEqual({ maxChars: 2000 });
    });

    it('空文字列はパラメータから除外する', () => {
      const parsed = parseRunnerFormValues(sampleTool, {
        title: 'テストタスク',
        priority: 'high',
        dueDate: '',
      });
      expect(parsed).toEqual({
        title: 'テストタスク',
        priority: 'high',
      });
    });

    it('数値変換できない文字列の場合はNaNではなくundefinedとして除外する', () => {
      const parsed = parseRunnerFormValues(numberTool, {
        maxChars: 'not-a-number',
      });
      expect(parsed).toEqual({});
    });
  });

  describe('buildToolsCallPayload', () => {
    it('正しいJSON-RPC 2.0 tools/call リクエストペイロードを生成する', () => {
      const payload = buildToolsCallPayload('search_knowledge_notes', {
        query: 'Next.js',
      }, 'test-req-1');

      expect(payload).toEqual({
        jsonrpc: '2.0',
        id: 'test-req-1',
        method: 'tools/call',
        params: {
          name: 'search_knowledge_notes',
          arguments: {
            query: 'Next.js',
          },
        },
      });
    });

    it('id未指定時は自動的にユニークなIDまたはタイムスタンプ付きIDが生成される', () => {
      const payload = buildToolsCallPayload('get_daily_briefing', {});
      expect(payload.jsonrpc).toBe('2.0');
      expect(payload.method).toBe('tools/call');
      expect(payload.id).toBeDefined();
      expect(payload.params).toEqual({
        name: 'get_daily_briefing',
        arguments: {},
      });
    });
  });
});

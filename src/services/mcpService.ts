import { getDb, type AppDb } from '@/db';
import { assembleContext } from '@/services/contextAssemblerService';
import { defaultScheduleProvider, type ScheduleProvider } from '@/services/scheduleService';
import { searchNotes } from '@/services/searchService';
import { createTask } from '@/services/taskService';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpToolDefinition,
  McpToolResult,
} from '@/types/mcp';
import { JSON_RPC_ERRORS } from '@/types/mcp';
import type { TaskPreview } from '@/types/portal';

export const MCP_TOOLS: readonly McpToolDefinition[] = [
  {
    name: 'get_daily_briefing',
    description:
      '本日の優先タスク、予定、および関連ナレッジ（RAG）を統合したデイリーコンテキストブリーフィング（Markdown形式）とサマリーを取得します。',
    inputSchema: {
      type: 'object',
      properties: {
        maxChars: {
          type: 'number',
          description: 'AIコンテキストに許容する最大文字数（省略時はデフォルト1500文字）',
        },
      },
    },
  },
  {
    name: 'search_knowledge_notes',
    description:
      'Second Brain に蓄積されたノート・メモを BM25 アルゴリズムで全文検索し、関連度の高い上位ノートを取得します。',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '検索クエリ文字列（必須）',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_portal_task',
    description:
      'ポータルに新しいタスクを登録します。優先度や期日（YYYY-MM-DD）を指定可能です。',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'タスクのタイトル（必須）',
        },
        priority: {
          type: 'string',
          description: '優先度（high, medium, low。デフォルトは medium）',
          enum: ['high', 'medium', 'low'],
        },
        dueDate: {
          type: 'string',
          description: '期限日（YYYY-MM-DD 形式、省略可）',
        },
      },
      required: ['title'],
    },
  },
];

export function listTools(): McpToolDefinition[] {
  return [...MCP_TOOLS];
}

export interface McpServiceDeps {
  db?: AppDb;
  scheduleProvider?: ScheduleProvider;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isValidJsonRpcRequest(payload: unknown): payload is JsonRpcRequest {
  if (!isObject(payload)) return false;
  if (payload.jsonrpc !== '2.0') return false;
  if (typeof payload.method !== 'string' || payload.method.trim().length === 0) return false;
  return true;
}

function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };
}

function extractId(payload: unknown): string | number | null {
  if (isObject(payload)) {
    const id = payload.id;
    if (typeof id === 'string' || typeof id === 'number') {
      return id;
    }
  }
  return null;
}

export async function handleJsonRpc(
  payload: unknown,
  deps?: McpServiceDeps
): Promise<JsonRpcResponse | null> {
  const reqId = extractId(payload);

  if (!isValidJsonRpcRequest(payload)) {
    return createErrorResponse(
      reqId,
      JSON_RPC_ERRORS.INVALID_REQUEST,
      'Invalid Request: must be a valid JSON-RPC 2.0 object'
    );
  }

  // 通知（id未指定またはundefined）の場合の処理
  const isNotification = payload.id === undefined || payload.id === null;
  const id = isNotification ? null : payload.id!;

  const db = deps?.db ?? getDb();
  const scheduleProvider = deps?.scheduleProvider ?? defaultScheduleProvider;

  switch (payload.method) {
    case 'initialize': {
      if (isNotification) return null;
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'personal-portal-mcp',
            version: '1.0.0',
          },
        },
      };
    }

    case 'notifications/initialized': {
      // クライアントからの初期化完了通知
      return null;
    }

    case 'ping': {
      if (isNotification) return null;
      return {
        jsonrpc: '2.0',
        id,
        result: {},
      };
    }

    case 'tools/list': {
      if (isNotification) return null;
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: listTools(),
        },
      };
    }

    case 'tools/call': {
      if (isNotification) return null;

      const params = payload.params;
      if (!isObject(params)) {
        return createErrorResponse(
          id,
          JSON_RPC_ERRORS.INVALID_PARAMS,
          'Invalid params: params must be an object'
        );
      }

      const toolName = params.name;
      if (typeof toolName !== 'string') {
        return createErrorResponse(
          id,
          JSON_RPC_ERRORS.INVALID_PARAMS,
          'Invalid params: tool name is required and must be a string'
        );
      }

      const args = params.arguments;
      if (args !== undefined && !isObject(args)) {
        return createErrorResponse(
          id,
          JSON_RPC_ERRORS.INVALID_PARAMS,
          'Invalid params: arguments must be an object if specified'
        );
      }

      const safeArgs: Record<string, unknown> = isObject(args) ? args : {};

      switch (toolName) {
        case 'get_daily_briefing': {
          let maxChars: number | undefined;
          if (safeArgs.maxChars !== undefined) {
            if (typeof safeArgs.maxChars !== 'number' || Number.isNaN(safeArgs.maxChars)) {
              return createErrorResponse(
                id,
                JSON_RPC_ERRORS.INVALID_PARAMS,
                'Invalid params: maxChars must be a valid number'
              );
            }
            maxChars = safeArgs.maxChars;
          }

          try {
            const assembled = assembleContext({ maxChars }, { db, scheduleProvider });
            const text = `${assembled.summaryText}\n\n${assembled.markdownPayload}`;
            const result: McpToolResult = {
              content: [
                {
                  type: 'text',
                  text,
                },
              ],
            };
            return {
              jsonrpc: '2.0',
              id,
              result,
            };
          } catch (err) {
            return createErrorResponse(
              id,
              JSON_RPC_ERRORS.INTERNAL_ERROR,
              err instanceof Error ? err.message : 'Failed to assemble context'
            );
          }
        }

        case 'search_knowledge_notes': {
          const query = safeArgs.query;
          if (typeof query !== 'string' || query.trim().length === 0) {
            return createErrorResponse(
              id,
              JSON_RPC_ERRORS.INVALID_PARAMS,
              'Invalid params: query is required and cannot be empty'
            );
          }

          try {
            const allRanked = searchNotes(query, db);
            const scoredOnly = allRanked.filter((item) => (item.score ?? 0) > 0);
            const top5 = scoredOnly.slice(0, 5);
            const result: McpToolResult = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(top5, null, 2),
                },
              ],
            };
            return {
              jsonrpc: '2.0',
              id,
              result,
            };
          } catch (err) {
            return createErrorResponse(
              id,
              JSON_RPC_ERRORS.INTERNAL_ERROR,
              err instanceof Error ? err.message : 'Failed to search notes'
            );
          }
        }

        case 'create_portal_task': {
          const title = safeArgs.title;
          if (typeof title !== 'string' || title.trim().length === 0) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: 'タイトルを入力してください',
                  },
                ],
                isError: true,
              } satisfies McpToolResult,
            };
          }

          const priorityRaw = safeArgs.priority;
          let priority: TaskPreview['priority'] | undefined;
          if (priorityRaw !== undefined) {
            if (typeof priorityRaw !== 'string' || !['high', 'medium', 'low'].includes(priorityRaw)) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: '優先度が不正です (high, medium, low)',
                    },
                  ],
                  isError: true,
                } satisfies McpToolResult,
              };
            }
            priority = priorityRaw as TaskPreview['priority'];
          }

          const dueDateRaw = safeArgs.dueDate;
          let dueDate: string | null | undefined;
          if (dueDateRaw !== undefined) {
            if (dueDateRaw === null || typeof dueDateRaw === 'string') {
              dueDate = dueDateRaw;
            } else {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: '期限日は YYYY-MM-DD 形式の文字列で指定してください',
                    },
                  ],
                  isError: true,
                } satisfies McpToolResult,
              };
            }
          }

          try {
            const created = createTask({ title, priority, dueDate }, db);
            const result: McpToolResult = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(created, null, 2),
                },
              ],
            };
            return {
              jsonrpc: '2.0',
              id,
              result,
            };
          } catch (err) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: err instanceof Error ? err.message : 'タスクの作成に失敗しました',
                  },
                ],
                isError: true,
              } satisfies McpToolResult,
            };
          }
        }

        default: {
          return createErrorResponse(
            id,
            JSON_RPC_ERRORS.METHOD_NOT_FOUND,
            `Tool not found: ${toolName}`
          );
        }
      }
    }

    default: {
      if (isNotification) return null;
      return createErrorResponse(
        id,
        JSON_RPC_ERRORS.METHOD_NOT_FOUND,
        `Method not found: ${payload.method}`
      );
    }
  }
}

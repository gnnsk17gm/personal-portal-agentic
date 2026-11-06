import type { JsonRpcRequest, McpToolDefinition } from '@/types/mcp';

/**
 * フォーム入力値（文字列マップ）から、McpToolDefinitionのSchemaに従って
 * パラメータ（Record<string, unknown>）へ安全に変換・パースする純粋関数
 */
export function parseRunnerFormValues(
  tool: McpToolDefinition,
  rawValues: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = tool.inputSchema?.properties ?? {};

  for (const [key, propDef] of Object.entries(properties)) {
    const rawVal = rawValues[key]?.trim();
    if (rawVal === undefined || rawVal === '') {
      continue;
    }

    if (propDef.type === 'number' || propDef.type === 'integer') {
      const num = Number(rawVal);
      if (!Number.isNaN(num)) {
        result[key] = num;
      }
    } else if (propDef.type === 'boolean') {
      result[key] = rawVal === 'true';
    } else {
      result[key] = rawVal;
    }
  }

  return result;
}

/**
 * tools/call 用の JSON-RPC 2.0 リクエストペイロードを組み立てる
 */
export function buildToolsCallPayload(
  toolName: string,
  args: Record<string, unknown>,
  customId?: string | number
): JsonRpcRequest {
  const id = customId ?? `runner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };
}

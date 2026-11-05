import { NextResponse } from 'next/server';
import { handleJsonRpc } from '@/services/mcpService';
import { JSON_RPC_ERRORS } from '@/types/mcp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Model Context Protocol (MCP) HTTP JSON-RPC 2.0 Endpoint
 *
 * 【セキュリティと認証に関する注意】
 * 本エンドポイントはローカル開発環境およびプライベートネットワーク内での
 * AIエージェント（Antigravity, Claude Desktop, Cursor等）による自律利用を前提としています。
 * インターネット等に公開する場合は、リバースプロキシでのBasic認証や
 * Authorization Header（Bearerトークン）等による認証ガードを必ず導入してください。
 */
export async function POST(request: Request) {
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: JSON_RPC_ERRORS.PARSE_ERROR,
          message: 'Parse error: failed to read request body',
        },
      },
      { status: 200 }
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: JSON_RPC_ERRORS.PARSE_ERROR,
          message: 'Parse error: invalid JSON syntax',
        },
      },
      { status: 200 }
    );
  }

  const response = await handleJsonRpc(payload);

  // 通知（Notification）の場合はレスポンス不要（HTTP 204 No Content）
  if (response === null) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(response);
}

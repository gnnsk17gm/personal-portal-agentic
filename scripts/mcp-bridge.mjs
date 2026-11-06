#!/usr/bin/env node

/**
 * MCP Stdio-to-HTTP Bridge
 *
 * Claude Desktop 等の標準入出力 (stdio) を前提とする MCP クライアントと、
 * Next.js 上の HTTP JSON-RPC エンドポイント (/api/mcp) を中継するゼロ依存スクリプト。
 */

import readline from 'node:readline';

const baseUrl = process.env.PORTAL_URL || 'http://localhost:3000';
const endpointUrl = `${baseUrl.replace(/\/+$/, '')}/api/mcp`;

function sendError(id, code, message, data) {
  const errPayload = {
    jsonrpc: '2.0',
    id: id ?? null,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };
  process.stdout.write(JSON.stringify(errPayload) + '\n');
}

export async function processLine(line, fetchFn = globalThis.fetch) {
  const trimmed = line.trim();
  if (!trimmed) return;

  let requestObj;
  try {
    requestObj = JSON.parse(trimmed);
  } catch (err) {
    sendError(null, -32700, 'Parse error: Invalid JSON received on stdin', String(err));
    return;
  }

  const isNotification = requestObj && typeof requestObj === 'object' && !('id' in requestObj);
  const requestId = requestObj?.id ?? null;

  try {
    const res = await fetchFn(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestObj),
    });

    if (!res.ok) {
      if (!isNotification) {
        sendError(
          requestId,
          -32603,
          `HTTP Error: Portal API responded with status ${res.status}`
        );
      }
      return;
    }

    const json = await res.json();
    if (!isNotification) {
      process.stdout.write(JSON.stringify(json) + '\n');
    }
  } catch (err) {
    if (!isNotification) {
      sendError(
        requestId,
        -32603,
        `Bridge connection failed: Could not reach ${endpointUrl}. Is the dev server running?`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}

// 直接スクリプトとして実行された場合に標準入力をリッスン
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/.*[\/\\]/, ''))) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', (line) => {
    processLine(line);
  });
}

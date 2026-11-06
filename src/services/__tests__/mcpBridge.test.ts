import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processLine } from '../../../scripts/mcp-bridge.mjs';

describe('mcp-bridge.mjs', () => {
  let stdoutChunks: string[] = [];
  let originalWrite: typeof process.stdout.write;

  beforeEach(() => {
    stdoutChunks = [];
    originalWrite = process.stdout.write;
    process.stdout.write = vi.fn((chunk: string | Uint8Array) => {
      stdoutChunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
      return true;
    }) as unknown as typeof process.stdout.write;
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    vi.restoreAllMocks();
  });

  it('不正なJSON行が渡された場合、JSON-RPC parse error (-32700) を stdout に出力する', async () => {
    await processLine('not-a-valid-json');
    expect(stdoutChunks.length).toBe(1);
    const parsed = JSON.parse(stdoutChunks[0]);
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBeNull();
    expect(parsed.error.code).toBe(-32700);
  });

  it('空行は無視される', async () => {
    await processLine('   ');
    expect(stdoutChunks.length).toBe(0);
  });

  it('正常なレスポンスが返ってきた場合、そのまま1行のJSONでstdoutに出力する', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        jsonrpc: '2.0',
        id: 'test-1',
        result: { tools: [] },
      }),
    });

    await processLine(
      JSON.stringify({ jsonrpc: '2.0', id: 'test-1', method: 'tools/list' }),
      mockFetch
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(stdoutChunks.length).toBe(1);
    const parsed = JSON.parse(stdoutChunks[0]);
    expect(parsed).toEqual({
      jsonrpc: '2.0',
      id: 'test-1',
      result: { tools: [] },
    });
  });

  it('APIがHTTPエラー(500)を返した場合、idを保持して-32603エラーを出力する', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await processLine(
      JSON.stringify({ jsonrpc: '2.0', id: 42, method: 'tools/call' }),
      mockFetch
    );

    expect(stdoutChunks.length).toBe(1);
    const parsed = JSON.parse(stdoutChunks[0]);
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBe(42);
    expect(parsed.error.code).toBe(-32603);
    expect(parsed.error.message).toContain('HTTP Error: Portal API responded with status 500');
  });

  it('ネットワーク接続失敗時、idを保持してわかりやすいエラーを出力する', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await processLine(
      JSON.stringify({ jsonrpc: '2.0', id: 'req-abc', method: 'tools/list' }),
      mockFetch
    );

    expect(stdoutChunks.length).toBe(1);
    const parsed = JSON.parse(stdoutChunks[0]);
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBe('req-abc');
    expect(parsed.error.code).toBe(-32603);
    expect(parsed.error.message).toContain('Bridge connection failed');
  });
});

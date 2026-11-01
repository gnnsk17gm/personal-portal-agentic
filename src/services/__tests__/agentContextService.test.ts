import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MAX_FILE_BYTES, getAgentContext, getSettingsSummary } from '@/services/agentContextService';

async function put(root: string, rel: string, body: string): Promise<void> {
  const full = path.join(root, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
}

describe('agentContextService', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'agent-ctx-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('カテゴリごとにファイルを分類して返す', async () => {
    await put(root, '.antigravity/rules/a.md', '# A');
    await put(root, '.antigravity/skills/s.md', '# S');
    await put(root, '.antigravity/hooks/verify.sh', 'echo hi');
    await put(root, 'specs/active/x.md', '# X');
    await put(root, 'specs/completed/y.md', '# Y');
    await put(root, 'docs/adr/0001.md', '# ADR');

    const files = await getAgentContext(root);
    const byCat = Object.fromEntries(files.map((f) => [f.category, f]));
    expect(Object.keys(byCat).sort()).toEqual(
      ['adrs', 'hooks', 'rules', 'skills', 'specs-active', 'specs-completed'].sort(),
    );
    expect(byCat.rules).toMatchObject({ name: 'a.md', path: '.antigravity/rules/a.md', content: '# A', charCount: 3 });
    expect(byCat.hooks.content).toBe('echo hi');
  });

  it('md 対象ディレクトリの .md 以外は除外し、hooks は拡張子を問わない', async () => {
    await put(root, '.antigravity/rules/a.md', 'ok');
    await put(root, '.antigravity/rules/secret.env', 'TOKEN=1');
    await put(root, '.antigravity/hooks/run', 'x');
    const files = await getAgentContext(root);
    expect(files.map((f) => f.name).sort()).toEqual(['a.md', 'run']);
  });

  it('ディレクトリが存在しなくてもエラーにならない', async () => {
    expect(await getAgentContext(root)).toEqual([]);
  });

  it('サブディレクトリは再帰しない', async () => {
    await put(root, '.antigravity/rules/nested/deep.md', 'deep');
    expect(await getAgentContext(root)).toEqual([]);
  });

  it('シンボリックリンクのファイルは除外する', async () => {
    const outside = path.join(root, 'outside.md');
    await writeFile(outside, 'SECRET');
    await mkdir(path.join(root, '.antigravity/rules'), { recursive: true });
    await symlink(outside, path.join(root, '.antigravity/rules/link.md'));
    await put(root, '.antigravity/rules/real.md', 'real');
    const files = await getAgentContext(root);
    expect(files.map((f) => f.name)).toEqual(['real.md']);
  });

  it('シンボリックリンクのディレクトリは走査しない', async () => {
    const outsideDir = path.join(root, 'elsewhere');
    await put(root, 'elsewhere/leak.md', 'LEAK');
    await mkdir(path.join(root, '.antigravity'), { recursive: true });
    await symlink(outsideDir, path.join(root, '.antigravity/rules'));
    expect(await getAgentContext(root)).toEqual([]);
  });

  it('サイズ上限（200KB）を超えるファイルは先頭のみ読み込み truncated になる', async () => {
    expect(MAX_FILE_BYTES).toBe(200 * 1024);
    await put(root, 'docs/adr/big.md', 'a'.repeat(MAX_FILE_BYTES + 1000));
    await put(root, 'docs/adr/small.md', 'tiny');
    const files = await getAgentContext(root);
    const big = files.find((f) => f.name === 'big.md');
    const small = files.find((f) => f.name === 'small.md');
    expect(big?.truncated).toBe(true);
    expect(big?.size).toBe(MAX_FILE_BYTES + 1000);
    expect(big?.content.length).toBeLessThanOrEqual(MAX_FILE_BYTES);
    expect(small?.truncated).toBe(false);
  });

  it('同カテゴリ内はファイル名の昇順', async () => {
    await put(root, 'docs/adr/0002.md', 'b');
    await put(root, 'docs/adr/0001.md', 'a');
    expect((await getAgentContext(root)).map((f) => f.name)).toEqual(['0001.md', '0002.md']);
  });

  it('getSettingsSummary は SDD 件数を返す', async () => {
    await put(root, 'specs/active/a.md', 'x');
    await put(root, 'specs/completed/b.md', 'x');
    await put(root, 'specs/completed/c.md', 'x');
    const summary = await getSettingsSummary(root);
    expect(summary.activeSpecs).toBe(1);
    expect(summary.completedSpecs).toBe(2);
    expect(summary.nodeVersion).toBe(process.version);
  });
});

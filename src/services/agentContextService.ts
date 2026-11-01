import { lstat, open, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { AgentContextCategory, AgentContextFile } from '@/types/portal';

/** 1ファイルあたりの読み込み上限（バイト）。 */
export const MAX_FILE_BYTES = 200 * 1024;

interface CategoryDef {
  category: AgentContextCategory;
  /** プロジェクトルートからの相対ディレクトリ（固定の許可リスト） */
  dir: string;
  /** null の場合は拡張子を問わない */
  extension: string | null;
}

/** 走査を許可するディレクトリの固定リスト。ユーザー入力からは決して組み立てない。 */
const CATEGORY_DEFS: readonly CategoryDef[] = [
  { category: 'rules', dir: '.antigravity/rules', extension: '.md' },
  { category: 'skills', dir: '.antigravity/skills', extension: '.md' },
  { category: 'hooks', dir: '.antigravity/hooks', extension: null },
  { category: 'specs-active', dir: 'specs/active', extension: '.md' },
  { category: 'specs-completed', dir: 'specs/completed', extension: '.md' },
  { category: 'adrs', dir: 'docs/adr', extension: '.md' },
];

export interface SettingsSummary {
  database: string;
  testRunner: string;
  nodeVersion: string;
  activeSpecs: number;
  completedSpecs: number;
}

async function isRealDirectory(target: string): Promise<boolean> {
  try {
    const stat = await lstat(target);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

async function readHead(filePath: string, size: number): Promise<{ text: string; truncated: boolean }> {
  const length = Math.min(size, MAX_FILE_BYTES);
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return { text: buffer.subarray(0, bytesRead).toString('utf8'), truncated: size > MAX_FILE_BYTES };
  } finally {
    await handle.close();
  }
}

async function readCategory(rootDir: string, def: CategoryDef): Promise<AgentContextFile[]> {
  const dirPath = path.join(rootDir, def.dir);
  if (!(await isRealDirectory(dirPath))) return [];

  const names = (await readdir(dirPath)).sort((a, b) => a.localeCompare(b));
  const result: AgentContextFile[] = [];
  for (const name of names) {
    if (def.extension !== null && !name.endsWith(def.extension)) continue;
    const filePath = path.join(dirPath, name);
    const stat = await lstat(filePath);
    // シンボリックリンク・ディレクトリ・特殊ファイルは対象外
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    const { text, truncated } = await readHead(filePath, stat.size);
    result.push({
      category: def.category,
      name,
      path: `${def.dir}/${name}`,
      charCount: text.length,
      size: stat.size,
      content: text,
      truncated,
    });
  }
  return result;
}

/** 許可リストのディレクトリからエージェント定義ファイルを読み取る（サーバー専用）。 */
export async function getAgentContext(rootDir: string = process.cwd()): Promise<AgentContextFile[]> {
  const groups = await Promise.all(CATEGORY_DEFS.map((def) => readCategory(rootDir, def)));
  return groups.flat();
}

async function countSpecs(rootDir: string, dir: string): Promise<number> {
  const dirPath = path.join(rootDir, dir);
  if (!(await isRealDirectory(dirPath))) return 0;
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith('.md')).length;
}

/** 設定画面用のシステム構成サマリー（秘密情報・絶対パス・環境変数は含めない）。 */
export async function getSettingsSummary(rootDir: string = process.cwd()): Promise<SettingsSummary> {
  const [activeSpecs, completedSpecs] = await Promise.all([
    countSpecs(rootDir, 'specs/active'),
    countSpecs(rootDir, 'specs/completed'),
  ]);
  return {
    database: 'SQLite (better-sqlite3) + Drizzle ORM / sqlite.db',
    testRunner: 'Vitest',
    nodeVersion: process.version,
    activeSpecs,
    completedSpecs,
  };
}

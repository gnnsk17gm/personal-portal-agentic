import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.ts';

export type AppDb = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __appDb?: AppDb };

export interface ResolveDatabasePathOptions {
  nodeEnv?: string;
  databasePath?: string;
  cwd?: string;
}

/**
 * 実行環境や環境変数に応じて SQLite データベースのパスを決定する純粋関数。
 */
export function resolveDatabasePath(options?: ResolveDatabasePathOptions): string {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === 'test') {
    return ':memory:';
  }

  const rawPath = options?.databasePath ?? process.env.DATABASE_PATH;
  if (rawPath && rawPath.trim() !== '') {
    return rawPath.trim();
  }

  const cwd = options?.cwd ?? process.cwd();
  return path.join(cwd, 'sqlite.db');
}

function openDb(filename: string): AppDb {
  if (filename !== ':memory:') {
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(filename);
  if (filename !== ':memory:') sqlite.pragma('journal_mode = WAL');
  const instance = drizzle(sqlite, { schema });
  migrate(instance, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return instance;
}

/** テスト用に、マイグレーション適用済みの新規インメモリDBを作成する（本番の sqlite.db には触れない）。 */
export function createTestDb(): AppDb {
  return openDb(':memory:');
}

function createDb(): AppDb {
  const filename = resolveDatabasePath();
  return openDb(filename);
}

/** DB接続を返す（Node.jsランタイム専用。初回にマイグレーションを自動適用）。 */
export function getDb(): AppDb {
  globalForDb.__appDb ??= createDb();
  return globalForDb.__appDb;
}

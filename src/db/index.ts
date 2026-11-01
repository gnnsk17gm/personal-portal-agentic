import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.ts';

export type AppDb = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __appDb?: AppDb };

function openDb(filename: string): AppDb {
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
  // NODE_ENV === 'test' のときは本番DBを汚染しないよう :memory: を使用する
  const filename = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(process.cwd(), 'sqlite.db');
  return openDb(filename);
}

/** DB接続を返す（Node.jsランタイム専用。初回にマイグレーションを自動適用）。 */
export function getDb(): AppDb {
  globalForDb.__appDb ??= createDb();
  return globalForDb.__appDb;
}

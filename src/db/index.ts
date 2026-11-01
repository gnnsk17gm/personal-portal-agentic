import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.ts';

export type AppDb = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __appDb?: AppDb };

function createDb(): AppDb {
  const sqlite = new Database(path.join(process.cwd(), 'sqlite.db'));
  sqlite.pragma('journal_mode = WAL');
  const instance = drizzle(sqlite, { schema });
  migrate(instance, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return instance;
}

/** DB接続を返す（Node.jsランタイム専用。初回にマイグレーションを自動適用）。 */
export function getDb(): AppDb {
  globalForDb.__appDb ??= createDb();
  return globalForDb.__appDb;
}

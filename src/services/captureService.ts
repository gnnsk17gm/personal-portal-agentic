import { desc, eq, sql } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db';
import { captures } from '@/db/schema';
import type { CapturePreview } from '@/types/portal';

/** LIKE のワイルドカード（% _）とエスケープ文字（\）をリテラル扱いにする。 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** 直近のメモを新しい順に取得する。 */
export function getRecentCaptures(limit = 3, db: AppDb = getDb()): CapturePreview[] {
  return db.select().from(captures).orderBy(desc(captures.id)).limit(limit).all();
}

/** 全メモを新しい順に取得する。searchQuery があれば本文の部分一致（大文字小文字を区別しない）で絞り込む。 */
export function getAllCaptures(searchQuery?: string, db: AppDb = getDb()): CapturePreview[] {
  const keyword = searchQuery?.trim() ?? '';
  const base = db.select().from(captures);
  const filtered =
    keyword.length > 0
      ? base.where(sql`${captures.content} LIKE ${`%${escapeLike(keyword)}%`} ESCAPE '\\'`)
      : base;
  return filtered.orderBy(desc(captures.id)).all();
}

/** メモを保存する（ISO 8601 で作成日時を記録）。空文字は Error。 */
export function createCapture(content: string, db: AppDb = getDb()): void {
  const text = content.trim();
  if (text.length === 0) throw new Error('メモを入力してください');
  db.insert(captures).values({ content: text, createdAt: new Date().toISOString() }).run();
}

/** メモを削除する。削除できた場合のみ true。 */
export function deleteCapture(id: number, db: AppDb = getDb()): boolean {
  return db.delete(captures).where(eq(captures.id, id)).run().changes > 0;
}

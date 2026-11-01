import { desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { captures } from '@/db/schema';
import type { CapturePreview } from '@/types/portal';

/** 直近のメモを新しい順に取得する。 */
export function getRecentCaptures(limit = 3): CapturePreview[] {
  return getDb().select().from(captures).orderBy(desc(captures.id)).limit(limit).all();
}

/** メモを保存する（ISO 8601 で作成日時を記録）。 */
export function createCapture(content: string): void {
  getDb().insert(captures).values({ content, createdAt: new Date().toISOString() }).run();
}

import { asc, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { seedIfEmpty } from '@/db/seed';
import { tasks } from '@/db/schema';
import type { TaskPreview } from '@/types/portal';

const PRIORITY_ORDER = sql`CASE ${tasks.priority} WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`;

/** ダッシュボード表示用タスク一覧（status問わず、優先度順→新しい順）。空なら初期データを投入。 */
export function getPriorityTasks(limit = 5): TaskPreview[] {
  const db = getDb();
  seedIfEmpty(db);
  return db
    .select()
    .from(tasks)
    .orderBy(asc(PRIORITY_ORDER), desc(tasks.createdAt), asc(tasks.id))
    .limit(limit)
    .all();
}

/** done ⇔ todo を切り替える（in_progress の場合は done にする）。 */
export function toggleTaskStatus(id: number): void {
  const db = getDb();
  const [task] = db.select({ status: tasks.status }).from(tasks).where(eq(tasks.id, id)).all();
  if (!task) return;
  db.update(tasks)
    .set({ status: task.status === 'done' ? 'todo' : 'done' })
    .where(eq(tasks.id, id))
    .run();
}

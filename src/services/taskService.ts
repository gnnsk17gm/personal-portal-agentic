import { asc, desc, eq, sql } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db';
import { seedIfEmpty } from '@/db/seed';
import { tasks } from '@/db/schema';
import type { TaskPreview } from '@/types/portal';

const PRIORITY_ORDER = sql`CASE ${tasks.priority} WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`;

const PRIORITIES: readonly TaskPreview['priority'][] = ['high', 'medium', 'low'];
const DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface CreateTaskInput {
  title: string;
  priority?: TaskPreview['priority'];
  /** YYYY-MM-DD。空文字・未指定は期限なし。 */
  dueDate?: string | null;
}

function isValidDate(value: string): boolean {
  if (!DUE_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** ダッシュボード表示用タスク一覧（status問わず、優先度順→新しい順）。空なら初期データを投入。 */
export function getPriorityTasks(limit = 5, db: AppDb = getDb()): TaskPreview[] {
  seedIfEmpty(db);
  return db
    .select()
    .from(tasks)
    .orderBy(asc(PRIORITY_ORDER), desc(tasks.createdAt), asc(tasks.id))
    .limit(limit)
    .all();
}

/** 全タスクを優先度順→新しい順で取得する（初期データ投入は行わない）。 */
export function getAllTasks(db: AppDb = getDb()): TaskPreview[] {
  return db
    .select()
    .from(tasks)
    .orderBy(asc(PRIORITY_ORDER), desc(tasks.createdAt), desc(tasks.id))
    .all();
}

/** タスクを新規作成する。タイトルが空、優先度・期限日が不正な場合は Error を投げる。 */
export function createTask(input: CreateTaskInput, db: AppDb = getDb()): TaskPreview {
  const title = input.title.trim();
  if (title.length === 0) throw new Error('タイトルを入力してください');

  const priority = input.priority ?? 'medium';
  if (!PRIORITIES.includes(priority)) throw new Error('優先度が不正です');

  const dueDate = input.dueDate ? input.dueDate : null;
  if (dueDate !== null && !isValidDate(dueDate)) throw new Error('期限日は YYYY-MM-DD 形式で指定してください');

  return db
    .insert(tasks)
    .values({ title, priority, dueDate, createdAt: new Date().toISOString() })
    .returning()
    .get();
}

/** done ⇔ todo を切り替える（in_progress の場合は done にする）。 */
export function toggleTaskStatus(id: number, db: AppDb = getDb()): void {
  const [task] = db.select({ status: tasks.status }).from(tasks).where(eq(tasks.id, id)).all();
  if (!task) return;
  db.update(tasks)
    .set({ status: task.status === 'done' ? 'todo' : 'done' })
    .where(eq(tasks.id, id))
    .run();
}

/** タスクを削除する。削除できた場合のみ true。 */
export function deleteTask(id: number, db: AppDb = getDb()): boolean {
  return db.delete(tasks).where(eq(tasks.id, id)).run().changes > 0;
}

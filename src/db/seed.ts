import { count } from 'drizzle-orm';
import type { AppDb } from './index.ts';
import { tasks } from './schema.ts';

/** tasks が空の場合のみ初期サンプルタスクを投入する。 */
export function seedIfEmpty(db: AppDb): void {
  const [row] = db.select({ value: count() }).from(tasks).all();
  if (row && row.value > 0) return;

  const now = new Date().toISOString();
  db.insert(tasks)
    .values([
      { title: 'Spec 002 の実装を完了する', priority: 'high', status: 'in_progress', dueDate: '今日', createdAt: now },
      { title: '次の仕様書（タスク管理）を起草', priority: 'medium', status: 'todo', dueDate: '明日', createdAt: now },
      { title: 'README を更新', priority: 'low', status: 'todo', dueDate: null, createdAt: now },
    ])
    .run();
}

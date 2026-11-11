import { like } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db';
import { tasks } from '@/db/schema';
import { runHealthSweep } from '@/services/sweeperService';
import { generateRemediationPlan } from '@/services/remediationService';
import type { ScenarioResult } from '@/types/portal';

export const DEMO_TASK_PREFIX = '[Demo] ';

export interface ScenarioDeps {
  db?: AppDb;
  now?: Date;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * "System Degradation & Self-Healing Demo" シナリオを実行する。
 * 1. 既存のデモ用タスクを削除（冪等性の担保）
 * 2. 期限切れタスク・滞留高優先度タスク等の不健全データを注入
 * 3. 自律型 Task Doctor (runHealthSweep) を実行
 * 4. 是正プラン (generateRemediationPlan) を生成して結果を返す
 */
export function runDegradationScenario(deps?: ScenarioDeps): ScenarioResult {
  const db = deps?.db ?? getDb();
  const now = deps?.now ?? new Date();

  // 1. 既存のデモタスク（[Demo] プレフィックス）を全削除
  db.delete(tasks)
    .where(like(tasks.title, `${DEMO_TASK_PREFIX}%`))
    .run();

  // 日付の計算
  const past10Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const past3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const past2Days = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const future3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // 2. デモデータの注入
  const demoTasks = [
    {
      title: `${DEMO_TASK_PREFIX}本番DBの障害復旧手順書の作成`,
      priority: 'high' as const,
      status: 'todo' as const,
      dueDate: formatLocalDate(past3Days), // 期限切れかつ滞留高優先度
      createdAt: past10Days.toISOString(),
    },
    {
      title: `${DEMO_TASK_PREFIX}セキュリティ監査ログの点検・棚卸し`,
      priority: 'high' as const,
      status: 'in_progress' as const,
      dueDate: formatLocalDate(future3Days), // 期限内だが10日滞留している高優先度
      createdAt: past10Days.toISOString(),
    },
    {
      title: `${DEMO_TASK_PREFIX}外部連携Webhookのタイムアウト監視設定`,
      priority: 'medium' as const,
      status: 'todo' as const,
      dueDate: formatLocalDate(past2Days), // 期限切れ
      createdAt: past3Days.toISOString(),
    },
  ];

  db.insert(tasks).values(demoTasks).run();

  // 3. Task Doctor による診断スイープの自律実行
  const sweepReport = runHealthSweep({ db, now });

  // 4. HITL 是正プランの生成確認
  const plan = generateRemediationPlan({ db, now });

  return {
    injectedCount: demoTasks.length,
    sweepStatus: sweepReport.status,
    remediationPlanCount: plan.actions.length,
  };
}


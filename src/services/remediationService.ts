import { eq } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db';
import { tasks, agentRuns, agentSteps } from '@/db/schema';
import { formatDate } from '@/services/taskDecomposerService';
import { runHealthSweep } from '@/services/sweeperService';
import type {
  RemediationAction,
  RemediationPlan,
  SweepReport,
} from '@/types/portal';

export const REMEDIATION_AGENT_GOAL = 'Task Remediation Execution (HITL Approved)';

export interface RemediationDeps {
  db?: AppDb;
  now?: Date;
}

export interface ApplyRemediationResult {
  appliedCount: number;
  skippedCount: number;
  newReport: SweepReport;
}

/**
 * 現在のDB状態から、不健全なタスク（期限切れ・滞留）に対する
 * 是正プラン（RemediationPlan）を副作用なしに生成する。
 */
export function generateRemediationPlan(deps?: RemediationDeps): RemediationPlan {
  const db = deps?.db ?? getDb();
  const now = deps?.now ?? new Date();
  const todayStr = formatDate(now);

  // now + 2日後の日付（ローカルYYYY-MM-DD）
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const proposedDueDate = formatDate(twoDaysLater);

  const allTasks = db.select().from(tasks).all();
  const pendingTasks = allTasks.filter((t) => t.status !== 'done');

  const actions: RemediationAction[] = [];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  for (const t of pendingTasks) {
    // 1. 期限切れの検査 (dueDate < todayStr)
    if (t.dueDate && t.dueDate < todayStr) {
      actions.push({
        taskId: t.id,
        taskTitle: t.title,
        actionType: 'reschedule',
        currentValue: t.dueDate,
        proposedValue: proposedDueDate,
        reason: `期限切れ（${t.dueDate}）のため、2日後（${proposedDueDate}）へリスケジュール`,
      });
    }

    // 2. 7日以上滞留している高優先度タスクの検査
    if (t.priority === 'high') {
      const createdTime = new Date(t.createdAt).getTime();
      if (!isNaN(createdTime) && now.getTime() - createdTime >= sevenDaysMs) {
        actions.push({
          taskId: t.id,
          taskTitle: t.title,
          actionType: 'adjust_priority',
          currentValue: 'high',
          proposedValue: 'medium',
          reason: '7日以上滞留しているため、優先度を通常（medium）へ調整（必要に応じて再設定）',
        });
      }
    }
  }

  return {
    actions,
    generatedAt: now.toISOString(),
  };
}

/**
 * 承認された是正アクション群をトランザクション内でアトミックに適用し、
 * agent_runs および agent_steps に実行ログを記録する。
 * 適用後、再度ヘルスチェックを実行して最新のレポートを返す。
 */
export function applyRemediations(
  plan: RemediationPlan,
  deps?: RemediationDeps
): ApplyRemediationResult {
  const db = deps?.db ?? getDb();
  const now = deps?.now ?? new Date();
  const nowIso = now.toISOString();

  if (plan.actions.length === 0) {
    const currentReport = runHealthSweep({ db, now });
    return {
      appliedCount: 0,
      skippedCount: 0,
      newReport: currentReport,
    };
  }

  // 1. 監査用 agent_runs の開始
  const insertedRun = db
    .insert(agentRuns)
    .values({
      goal: REMEDIATION_AGENT_GOAL,
      status: 'running',
      createdAt: nowIso,
    })
    .returning({ id: agentRuns.id })
    .get();

  const runId = insertedRun.id;

  let appliedCount = 0;
  let skippedCount = 0;
  const auditDetails: string[] = [];

  try {
    // 2. トランザクション内でアトミックに適用
    db.transaction((tx) => {
      for (const action of plan.actions) {
        const currentTask = tx
          .select()
          .from(tasks)
          .where(eq(tasks.id, action.taskId))
          .get();

        if (!currentTask || currentTask.status === 'done') {
          skippedCount++;
          auditDetails.push(
            `Task #${action.taskId} は既に完了または削除されているためスキップ`
          );
          continue;
        }

        if (action.actionType === 'reschedule') {
          // currentValue と一致するか検証（競合検知）
          if (currentTask.dueDate !== action.currentValue) {
            skippedCount++;
            auditDetails.push(
              `Task #${action.taskId} の期日（現: ${currentTask.dueDate}）が提案時（${action.currentValue}）と異なるためスキップ`
            );
            continue;
          }

          tx.update(tasks)
            .set({ dueDate: action.proposedValue })
            .where(eq(tasks.id, action.taskId))
            .run();
          appliedCount++;
          auditDetails.push(
            `Task #${action.taskId}「${action.taskTitle}」の期日を ${action.currentValue} から ${action.proposedValue} に更新`
          );
        } else if (action.actionType === 'adjust_priority') {
          if (currentTask.priority !== action.currentValue) {
            skippedCount++;
            auditDetails.push(
              `Task #${action.taskId} の優先度（現: ${currentTask.priority}）が提案時（${action.currentValue}）と異なるためスキップ`
            );
            continue;
          }

          tx.update(tasks)
            .set({ priority: action.proposedValue as 'high' | 'medium' | 'low' })
            .where(eq(tasks.id, action.taskId))
            .run();
          appliedCount++;
          auditDetails.push(
            `Task #${action.taskId}「${action.taskTitle}」の優先度を ${action.currentValue} から ${action.proposedValue} に更新`
          );
        }
      }

      // agent_steps に実行結果ログを記録
      tx.insert(agentSteps)
        .values({
          runId,
          stepName: 'execute_remediation',
          agentRole: 'orchestrator',
          status: 'success',
          detail: `是正アクション適用: 成功 ${appliedCount} 件, スキップ ${skippedCount} 件\n${auditDetails.join('\n')}`,
          createdAt: nowIso,
        })
        .run();
    });

    // 3. agent_runs の完了記録
    db.update(agentRuns)
      .set({
        status: 'completed',
        completedAt: nowIso,
      })
      .where(eq(agentRuns.id, runId))
      .run();

    // 4. 再度ヘルスチェックを実行して最新の健全性レポートを取得
    const newReport = runHealthSweep({ db, now });

    // スイープ結果のサマリーを agent_steps に追加記録
    db.insert(agentSteps)
      .values({
        runId,
        stepName: 'verify_system_health',
        agentRole: 'critic',
        status: 'success',
        detail: `再診断完了: 判定=${newReport.status}, 期限切れ=${newReport.overdueTasksCount}件`,
        createdAt: nowIso,
      })
      .run();

    return {
      appliedCount,
      skippedCount,
      newReport,
    };
  } catch (err) {
    db.update(agentRuns)
      .set({
        status: 'failed',
        completedAt: nowIso,
      })
      .where(eq(agentRuns.id, runId))
      .run();
    throw err;
  }
}


import { desc, eq } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db';
import { tasks, captures, agentRuns, agentSteps } from '@/db/schema';
import { formatDate } from '@/services/taskDecomposerService';
import type { AgentRole, HealthStatus, SweepReport } from '@/types/portal';

export const SWEEPER_AGENT_GOAL = 'Autonomous System Health & Task Doctor';

export interface SweeperDeps {
  db?: AppDb;
  now?: Date;
}

interface InternalStepRecord {
  runId: number;
  stepName: string;
  agentRole: AgentRole;
  status: 'success' | 'error';
  detail: string;
  createdAt: string;
}

function recordStep(
  db: AppDb,
  runId: number,
  stepName: string,
  agentRole: AgentRole,
  status: 'success' | 'error',
  detail: string,
  nowIso: string
): void {
  const record: InternalStepRecord = {
    runId,
    stepName,
    agentRole,
    status,
    detail,
    createdAt: nowIso,
  };
  db.insert(agentSteps).values(record).run();
}

/**
 * 自律的にシステム内のタスクおよびキャプチャの健康状態を診断し、
 * agent_runs および agent_steps に実行トレースを永続化する。
 */
export function runHealthSweep(deps?: SweeperDeps): SweepReport {
  const db = deps?.db ?? getDb();
  const now = deps?.now ?? new Date();
  const nowIso = now.toISOString();
  const todayStr = formatDate(now);

  // 1. agent_runs の初期化
  const insertedRun = db
    .insert(agentRuns)
    .values({
      goal: SWEEPER_AGENT_GOAL,
      status: 'running',
      createdAt: nowIso,
    })
    .returning({ id: agentRuns.id })
    .get();

  const runId = insertedRun.id;

  try {
    // 2. データの収集 (Researcher)
    const allTasks = db.select().from(tasks).all();
    const allCaptures = db.select().from(captures).all();

    const pendingTasks = allTasks.filter((t) => t.status !== 'done');
    const totalPendingCount = pendingTasks.length;
    const captureCount = allCaptures.length;

    recordStep(
      db,
      runId,
      'scan_tasks',
      'researcher',
      'success',
      `システム点検: 未完了タスク ${totalPendingCount} 件, メモ ${captureCount} 件を検出`,
      nowIso
    );

    // 3. 診断ロジックの評価 (Critic)
    // 3.1 期限切れタスクの検出 (dueDate < todayStr)
    const overdueTasks = pendingTasks.filter((t) => {
      if (!t.dueDate) return false;
      return t.dueDate < todayStr;
    });
    const overdueTasksCount = overdueTasks.length;

    // 3.2 滞留タスク & 未完了高優先度タスクの検出
    // 滞留条件: status !== 'done' && priority === 'high' && 作成から7日以上経過
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const staleHighTasks = pendingTasks.filter((t) => {
      if (t.priority !== 'high') return false;
      const createdTime = new Date(t.createdAt).getTime();
      return !isNaN(createdTime) && now.getTime() - createdTime >= sevenDaysMs;
    });

    const highPriorityPendingCount = pendingTasks.filter(
      (t) => t.priority === 'high'
    ).length;

    // 3.3 Capture Health
    const captureWarning = totalPendingCount > 0 && captureCount === 0;

    // 3.4 総合判定ステータス
    let status: HealthStatus = 'healthy';
    if (
      overdueTasksCount >= 3 ||
      (overdueTasksCount >= 1 && staleHighTasks.length >= 1)
    ) {
      status = 'critical';
    } else if (
      overdueTasksCount >= 1 ||
      staleHighTasks.length >= 1 ||
      captureWarning
    ) {
      status = 'warning';
    }

    // 3.5 推奨事項（Recommendations）とサマリーの策定
    const recommendations: string[] = [];
    for (const t of overdueTasks) {
      recommendations.push(
        `期限切れタスク「${t.title}」（期日: ${t.dueDate}）の期日再設定または完了を行ってください。`
      );
    }
    for (const t of staleHighTasks) {
      recommendations.push(
        `重要タスク「${t.title}」が7日以上滞留しています。タスク分解または早期着手を推奨します。`
      );
    }
    if (captureWarning) {
      recommendations.push(
        '未完了タスクがありますがSecond Brain（メモ）が0件です。Quick Captureで文脈や参考情報を記録しましょう。'
      );
    }

    let summary = 'システムは健康です。滞留しているタスクや期限切れはありません。';
    if (status === 'critical') {
      summary = `重大な課題が検出されました。期限切れタスクが ${overdueTasksCount} 件、7日以上滞留している重要タスクが ${staleHighTasks.length} 件あります。`;
    } else if (status === 'warning') {
      const reasons: string[] = [];
      if (overdueTasksCount > 0) reasons.push(`期限切れ ${overdueTasksCount} 件`);
      if (staleHighTasks.length > 0)
        reasons.push(`滞留重要タスク ${staleHighTasks.length} 件`);
      if (captureWarning) reasons.push('メモ未整備');
      summary = `改善推奨事項があります（${reasons.join('、')}）。`;
    }

    recordStep(
      db,
      runId,
      'evaluate_health',
      'critic',
      'success',
      `健全性診断完了: ステータス=${status}, 期限切れ=${overdueTasksCount}件, 滞留重要=${staleHighTasks.length}件, 全未完了=${totalPendingCount}件`,
      nowIso
    );

    const report: SweepReport = {
      status,
      summary,
      overdueTasksCount,
      highPriorityPendingCount,
      totalPendingCount,
      recommendations,
      sweptAt: nowIso,
    };

    // 4. 診断結果の永続化 (Orchestrator)
    recordStep(
      db,
      runId,
      'persist_diagnosis',
      'orchestrator',
      'success',
      JSON.stringify(report),
      nowIso
    );

    // 5. agent_runs の完了記録
    db.update(agentRuns)
      .set({
        status: 'completed',
        completedAt: nowIso,
      })
      .where(eq(agentRuns.id, runId))
      .run();

    return report;
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

/**
 * 過去に実行された最新の自律巡回診断レポートを取得する。
 * 診断履歴が存在しない場合は null を返す。
 */
export function getLatestSweepReport(db: AppDb = getDb()): SweepReport | null {
  const latestRun = db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.goal, SWEEPER_AGENT_GOAL))
    .orderBy(desc(agentRuns.id))
    .limit(1)
    .get();

  if (!latestRun || latestRun.status !== 'completed') {
    return null;
  }

  const persistStep = db
    .select()
    .from(agentSteps)
    .where(eq(agentSteps.runId, latestRun.id))
    .all()
    .find((s) => s.stepName === 'persist_diagnosis');

  if (!persistStep) {
    return null;
  }

  try {
    const report = JSON.parse(persistStep.detail) as SweepReport;
    return report;
  } catch {
    return null;
  }
}


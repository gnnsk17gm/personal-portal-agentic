import { desc } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db';
import { agentRuns, agentSteps } from '@/db/schema';
import type {
  AgentDailyActivity,
  AgentRunPreview,
  AgentRunStatus,
  AgentStepPreview,
  AgentSystemMetrics,
} from '@/types/portal';

export interface AgentMetricsDeps {
  db?: AppDb;
  now?: Date;
}

export type RunStatusFilter = 'all' | 'completed' | 'failed' | 'running';

export interface ListRunsDeps {
  db?: AppDb;
  filter?: RunStatusFilter;
}

export interface RunWithSteps {
  run: AgentRunPreview;
  steps: AgentStepPreview[];
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 過去7日分の日付配列（YYYY-MM-DD昇順）を生成する
 */
function getPast7Days(now: Date): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const target = new Date(now);
    target.setDate(target.getDate() - i);
    days.push(formatLocalDate(target));
  }
  return days;
}

/**
 * エージェント実行メトリクス（総実行数・成功率・ロール別内訳・直近7日推移）を算出する
 */
export function getAgentSystemMetrics(deps?: AgentMetricsDeps): AgentSystemMetrics {
  const db = deps?.db ?? getDb();
  const now = deps?.now ?? new Date();

  const allRuns = db.select().from(agentRuns).all();
  const allSteps = db.select().from(agentSteps).all();

  const totalRuns = allRuns.length;
  let completedRuns = 0;
  let failedRuns = 0;
  let runningRuns = 0;

  // 日付ごとの Run カウントマップ初期化（直近7日）
  const past7Days = getPast7Days(now);
  const dailyCounts = new Map<string, number>();
  for (const day of past7Days) {
    dailyCounts.set(day, 0);
  }

  for (const run of allRuns) {
    if (run.status === 'completed') {
      completedRuns++;
    } else if (run.status === 'failed') {
      failedRuns++;
    } else if (run.status === 'running') {
      runningRuns++;
    }

    // createdAt は ISO 文字列（例: 2026-11-11T...）
    if (run.createdAt) {
      const runDate = new Date(run.createdAt);
      if (!isNaN(runDate.getTime())) {
        const dateKey = formatLocalDate(runDate);
        if (dailyCounts.has(dateKey)) {
          dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1);
        }
      }
    }
  }

  // 成功率の計算（分母: completed + failed, 小数点以下切り捨て）
  const finishedRuns = completedRuns + failedRuns;
  const successRate =
    finishedRuns > 0 ? Math.floor((completedRuns / finishedRuns) * 100) : 0;

  // ロール別集計
  const roleBreakdown = {
    researcher: 0,
    planner: 0,
    critic: 0,
    orchestrator: 0,
  };

  for (const step of allSteps) {
    if (step.agentRole in roleBreakdown) {
      roleBreakdown[step.agentRole as keyof typeof roleBreakdown]++;
    }
  }

  const recentActivity: AgentDailyActivity[] = past7Days.map((date) => ({
    date,
    count: dailyCounts.get(date) ?? 0,
  }));

  return {
    totalRuns,
    completedRuns,
    failedRuns,
    runningRuns,
    activeSubagents: runningRuns,
    successRate,
    roleBreakdown,
    recentActivity,
  };
}

/**
 * 実行履歴およびステップ一覧を取得する（フィルタ対応・降順）
 */
export function listAgentRunsWithSteps(deps?: ListRunsDeps): RunWithSteps[] {
  const db = deps?.db ?? getDb();
  const filter = deps?.filter ?? 'all';

  const runsQuery = db.select().from(agentRuns).orderBy(desc(agentRuns.id));

  let matchedRuns = runsQuery.all();
  if (filter !== 'all') {
    matchedRuns = matchedRuns.filter((r) => r.status === filter);
  }

  const allSteps = db.select().from(agentSteps).all();

  // runId でグルーピング
  const stepsMap = new Map<number, AgentStepPreview[]>();
  for (const s of allSteps) {
    const list = stepsMap.get(s.runId) ?? [];
    list.push({
      id: s.id,
      runId: s.runId,
      stepName: s.stepName,
      status: s.status,
      detail: s.detail,
      agentRole: s.agentRole,
      createdAt: s.createdAt,
    });
    stepsMap.set(s.runId, list);
  }

  return matchedRuns.map((r) => ({
    run: {
      id: r.id,
      goal: r.goal,
      status: r.status as AgentRunStatus,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    },
    steps: stepsMap.get(r.id) ?? [],
  }));
}

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import { agentRuns, agentSteps } from '@/db/schema';
import {
  getAgentSystemMetrics,
  listAgentRunsWithSteps,
} from '@/services/agentMetricsService';

describe('agentMetricsService', () => {
  let db: AppDb;
  const fixedNow = new Date('2026-11-11T12:00:00.000Z');

  beforeEach(() => {
    db = createTestDb();
  });

  describe('getAgentSystemMetrics', () => {
    it('DBが空の場合は初期状態のゼロ値メトリクスを返す', () => {
      const metrics = getAgentSystemMetrics({ db, now: fixedNow });

      expect(metrics.totalRuns).toBe(0);
      expect(metrics.completedRuns).toBe(0);
      expect(metrics.failedRuns).toBe(0);
      expect(metrics.runningRuns).toBe(0);
      expect(metrics.activeSubagents).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.roleBreakdown).toEqual({
        researcher: 0,
        planner: 0,
        critic: 0,
        orchestrator: 0,
      });
      expect(metrics.recentActivity).toHaveLength(7);
      expect(metrics.recentActivity[6].date).toBe('2026-11-11');
      expect(metrics.recentActivity[6].count).toBe(0);
    });

    it('成功率が小数点以下切り捨てで計算され、runningは分母から除外される', () => {
      // 2 completed, 1 failed, 1 running -> 2 / (2 + 1) = 66.666...% -> 66%
      db.insert(agentRuns)
        .values([
          {
            goal: 'Goal 1',
            status: 'completed',
            createdAt: '2026-11-11T01:00:00.000Z',
          },
          {
            goal: 'Goal 2',
            status: 'completed',
            createdAt: '2026-11-11T02:00:00.000Z',
          },
          {
            goal: 'Goal 3',
            status: 'failed',
            createdAt: '2026-11-11T03:00:00.000Z',
          },
          {
            goal: 'Goal 4',
            status: 'running',
            createdAt: '2026-11-11T04:00:00.000Z',
          },
        ])
        .run();

      const metrics = getAgentSystemMetrics({ db, now: fixedNow });

      expect(metrics.totalRuns).toBe(4);
      expect(metrics.completedRuns).toBe(2);
      expect(metrics.failedRuns).toBe(1);
      expect(metrics.runningRuns).toBe(1);
      expect(metrics.activeSubagents).toBe(1);
      expect(metrics.successRate).toBe(66);
    });

    it('ステップのロール別集計が正しくカウントされる', () => {
      const run = db
        .insert(agentRuns)
        .values({
          goal: 'Goal Multi-role',
          status: 'completed',
          createdAt: '2026-11-11T05:00:00.000Z',
        })
        .returning({ id: agentRuns.id })
        .get();

      db.insert(agentSteps)
        .values([
          {
            runId: run.id,
            stepName: 's1',
            agentRole: 'researcher',
            status: 'success',
            detail: 'd1',
            createdAt: '2026-11-11T05:01:00.000Z',
          },
          {
            runId: run.id,
            stepName: 's2',
            agentRole: 'researcher',
            status: 'success',
            detail: 'd2',
            createdAt: '2026-11-11T05:02:00.000Z',
          },
          {
            runId: run.id,
            stepName: 's3',
            agentRole: 'planner',
            status: 'success',
            detail: 'd3',
            createdAt: '2026-11-11T05:03:00.000Z',
          },
          {
            runId: run.id,
            stepName: 's4',
            agentRole: 'critic',
            status: 'success',
            detail: 'd4',
            createdAt: '2026-11-11T05:04:00.000Z',
          },
          {
            runId: run.id,
            stepName: 's5',
            agentRole: 'orchestrator',
            status: 'success',
            detail: 'd5',
            createdAt: '2026-11-11T05:05:00.000Z',
          },
        ])
        .run();

      const metrics = getAgentSystemMetrics({ db, now: fixedNow });

      expect(metrics.roleBreakdown).toEqual({
        researcher: 2,
        planner: 1,
        critic: 1,
        orchestrator: 1,
      });
    });

    it('直近7日間の日別アクティビティ推移が正しく集計される', () => {
      // fixedNow: 2026-11-11
      // 過去7日: 2026-11-05 〜 2026-11-11
      db.insert(agentRuns)
        .values([
          {
            goal: 'Old Run (8日前)',
            status: 'completed',
            createdAt: '2026-11-03T10:00:00.000Z',
          },
          {
            goal: 'Run on Nov 05',
            status: 'completed',
            createdAt: '2026-11-05T09:00:00.000Z',
          },
          {
            goal: 'Run 1 on Nov 11',
            status: 'completed',
            createdAt: '2026-11-11T08:00:00.000Z',
          },
          {
            goal: 'Run 2 on Nov 11',
            status: 'completed',
            createdAt: '2026-11-11T10:00:00.000Z',
          },
        ])
        .run();

      const metrics = getAgentSystemMetrics({ db, now: fixedNow });

      expect(metrics.recentActivity).toHaveLength(7);
      expect(metrics.recentActivity[0].date).toBe('2026-11-05');
      expect(metrics.recentActivity[0].count).toBe(1);
      expect(metrics.recentActivity[6].date).toBe('2026-11-11');
      expect(metrics.recentActivity[6].count).toBe(2);
    });
  });

  describe('listAgentRunsWithSteps', () => {
    it('フィルタ指定（all / completed / failed）に応じて正しく降順で一覧を取得できる', () => {
      const run1 = db
        .insert(agentRuns)
        .values({
          goal: 'Run 1',
          status: 'completed',
          createdAt: '2026-11-11T01:00:00.000Z',
        })
        .returning({ id: agentRuns.id })
        .get();

      const run2 = db
        .insert(agentRuns)
        .values({
          goal: 'Run 2',
          status: 'failed',
          createdAt: '2026-11-11T02:00:00.000Z',
        })
        .returning({ id: agentRuns.id })
        .get();

      db.insert(agentSteps)
        .values([
          {
            runId: run1.id,
            stepName: 'step1',
            agentRole: 'planner',
            status: 'success',
            detail: 'done',
            createdAt: '2026-11-11T01:05:00.000Z',
          },
        ])
        .run();

      const all = listAgentRunsWithSteps({ db, filter: 'all' });
      expect(all).toHaveLength(2);
      expect(all[0].run.id).toBe(run2.id); // 降順
      expect(all[1].run.id).toBe(run1.id);
      expect(all[1].steps).toHaveLength(1);
      expect(all[1].steps[0].stepName).toBe('step1');

      const completed = listAgentRunsWithSteps({ db, filter: 'completed' });
      expect(completed).toHaveLength(1);
      expect(completed[0].run.id).toBe(run1.id);

      const failed = listAgentRunsWithSteps({ db, filter: 'failed' });
      expect(failed).toHaveLength(1);
      expect(failed[0].run.id).toBe(run2.id);
    });
  });
});


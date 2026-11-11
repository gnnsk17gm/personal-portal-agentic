import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import { tasks, captures, agentRuns, agentSteps } from '@/db/schema';
import {
  runHealthSweep,
  getLatestSweepReport,
  SWEEPER_AGENT_GOAL,
} from '@/services/sweeperService';

describe('sweeperService', () => {
  let db: AppDb;
  const fixedNow = new Date('2026-11-10T12:00:00Z'); // 2026-11-10

  beforeEach(() => {
    db = createTestDb();
  });

  describe('runHealthSweep', () => {
    it('タスク・メモが空の場合、healthyステータスのレポートを生成し、agent_runsとstepsを永続化する', () => {
      const report = runHealthSweep({ db, now: fixedNow });

      expect(report.status).toBe('healthy');
      expect(report.overdueTasksCount).toBe(0);
      expect(report.highPriorityPendingCount).toBe(0);
      expect(report.totalPendingCount).toBe(0);
      expect(report.sweptAt).toBe(fixedNow.toISOString());
      expect(report.summary).toContain('健康');

      // 永続化された agent_runs の検証
      const runs = db.select().from(agentRuns).all();
      expect(runs).toHaveLength(1);
      expect(runs[0].goal).toBe(SWEEPER_AGENT_GOAL);
      expect(runs[0].status).toBe('completed');
      expect(runs[0].completedAt).toBe(fixedNow.toISOString());

      // 永続化された agent_steps の検証
      const steps = db.select().from(agentSteps).all();
      expect(steps.length).toBeGreaterThanOrEqual(3);
      const stepNames = steps.map((s) => s.stepName);
      expect(stepNames).toContain('scan_tasks');
      expect(stepNames).toContain('evaluate_health');
      expect(stepNames).toContain('persist_diagnosis');

      // 最新レポートの取得
      const latest = getLatestSweepReport(db);
      expect(latest).not.toBeNull();
      expect(latest?.status).toBe('healthy');
      expect(latest?.sweptAt).toBe(fixedNow.toISOString());
    });

    it('期限切れタスクを検知し、完了済みタスクや今日が期日のタスクは除外する', () => {
      // 1. 期限切れ未完了タスク (dueDate: 2026-11-09 < 2026-11-10) -> カウント対象
      db.insert(tasks).values({
        title: '期限切れタスク1',
        priority: 'medium',
        status: 'todo',
        dueDate: '2026-11-09',
        createdAt: '2026-11-01T00:00:00Z',
      }).run();

      // 2. 期限切れだが完了済みタスク -> カウント除外
      db.insert(tasks).values({
        title: '期限切れ完了タスク',
        priority: 'high',
        status: 'done',
        dueDate: '2026-11-08',
        createdAt: '2026-11-01T00:00:00Z',
      }).run();

      // 3. 今日期日タスク (dueDate: 2026-11-10) -> 期限切れではない
      db.insert(tasks).values({
        title: '今日期日タスク',
        priority: 'low',
        status: 'in_progress',
        dueDate: '2026-11-10',
        createdAt: '2026-11-05T00:00:00Z',
      }).run();

      // 4. メモを追加して Capture Health をクリア
      db.insert(captures).values({
        content: '関連メモ',
        createdAt: '2026-11-05T00:00:00Z',
      }).run();

      const report = runHealthSweep({ db, now: fixedNow });

      expect(report.overdueTasksCount).toBe(1);
      expect(report.totalPendingCount).toBe(2);
      expect(report.status).toBe('warning'); // 期限切れ1件なので warning
      expect(report.recommendations.some((r) => r.includes('期限切れタスク1'))).toBe(true);
    });

    it('高優先度かつ作成から7日以上経過した滞留タスク（Stale Task）を検出し、highPriorityPendingCountを集計する', () => {
      // 7日以上前の高優先度タスク (2026-11-02作成、nowは11-10) -> 8日前
      db.insert(tasks).values({
        title: '放置された高優先度タスク',
        priority: 'high',
        status: 'todo',
        dueDate: '2026-11-20',
        createdAt: '2026-11-02T00:00:00Z',
      }).run();

      // 3日前の高優先度タスク (2026-11-07作成) -> 滞留ではない
      db.insert(tasks).values({
        title: '最近の高優先度タスク',
        priority: 'high',
        status: 'todo',
        dueDate: '2026-11-20',
        createdAt: '2026-11-07T00:00:00Z',
      }).run();

      // メモを追加して Capture Health をクリア
      db.insert(captures).values({
        content: 'メモあり',
        createdAt: '2026-11-05T00:00:00Z',
      }).run();

      const report = runHealthSweep({ db, now: fixedNow });

      expect(report.highPriorityPendingCount).toBe(2); // 未完了highの合計
      expect(report.overdueTasksCount).toBe(0);
      expect(report.status).toBe('warning'); // 滞留highが1件あるため warning
      expect(report.recommendations.some((r) => r.includes('放置された高優先度タスク'))).toBe(true);
    });

    it('未完了タスクがあるのにメモが0件の場合、warningステータスとなりCapture Healthの改善提案を出す', () => {
      db.insert(tasks).values({
        title: '通常のタスク',
        priority: 'low',
        status: 'todo',
        dueDate: '2026-11-20',
        createdAt: '2026-11-09T00:00:00Z',
      }).run();

      // メモは0件
      const report = runHealthSweep({ db, now: fixedNow });

      expect(report.status).toBe('warning');
      expect(report.recommendations.some((r) => r.includes('Second Brain') || r.includes('メモ'))).toBe(true);
    });

    it('Critical判定: 期限切れタスクが3件以上の場合に critical ステータスとなる', () => {
      for (let i = 1; i <= 3; i++) {
        db.insert(tasks).values({
          title: `期限切れタスク${i}`,
          priority: 'medium',
          status: 'todo',
          dueDate: '2026-11-08',
          createdAt: '2026-11-01T00:00:00Z',
        }).run();
      }

      db.insert(captures).values({ content: 'メモ', createdAt: '2026-11-01T00:00:00Z' }).run();

      const report = runHealthSweep({ db, now: fixedNow });
      expect(report.status).toBe('critical');
      expect(report.overdueTasksCount).toBe(3);
    });

    it('Critical判定: 期限切れが1件以上かつ滞留高優先度タスクが1件以上の場合に critical ステータスとなる', () => {
      // 期限切れタスク (1件)
      db.insert(tasks).values({
        title: '期限切れタスク',
        priority: 'medium',
        status: 'todo',
        dueDate: '2026-11-08',
        createdAt: '2026-11-05T00:00:00Z',
      }).run();

      // 滞留高優先度タスク (1件, 8日前作成)
      db.insert(tasks).values({
        title: '滞留重要タスク',
        priority: 'high',
        status: 'todo',
        dueDate: '2026-11-20',
        createdAt: '2026-11-01T00:00:00Z',
      }).run();

      db.insert(captures).values({ content: 'メモ', createdAt: '2026-11-01T00:00:00Z' }).run();

      const report = runHealthSweep({ db, now: fixedNow });
      expect(report.status).toBe('critical');
      expect(report.overdueTasksCount).toBe(1);
    });

    it('異常発生時に agent_runs を failed として記録しエラーを再送出する', () => {
      // 不正なDBオブジェクトを模擬
      const mockDb = {
        select: () => {
          throw new Error('Database read failed');
        },
        insert: db.insert.bind(db),
        update: db.update.bind(db),
      } as unknown as AppDb;

      expect(() => {
        runHealthSweep({ db: mockDb, now: fixedNow });
      }).toThrow('Database read failed');

      // agent_runs に failed が記録されていること
      const runs = db.select().from(agentRuns).all();
      expect(runs).toHaveLength(1);
      expect(runs[0].status).toBe('failed');
      expect(runs[0].completedAt).toBe(fixedNow.toISOString());
    });
  });

  describe('getLatestSweepReport', () => {
    it('診断履歴がない場合は null を返す', () => {
      const result = getLatestSweepReport(db);
      expect(result).toBeNull();
    });
  });
});


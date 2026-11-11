import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type AppDb } from '@/db';
import { tasks, captures, agentRuns, agentSteps } from '@/db/schema';
import {
  generateRemediationPlan,
  applyRemediations,
  REMEDIATION_AGENT_GOAL,
} from '@/services/remediationService';
import { getLatestSweepReport } from '@/services/sweeperService';

describe('remediationService', () => {
  let db: AppDb;
  // 基準日時: 2026-11-10T12:00:00Z -> today: 2026-11-10, now + 2 days: 2026-11-12
  const fixedNow = new Date('2026-11-10T12:00:00Z');

  beforeEach(() => {
    db = createTestDb();
  });

  describe('generateRemediationPlan', () => {
    it('期限切れ未完了タスクから reschedule アクション（now + 2日）を生成する', () => {
      db.insert(tasks)
        .values({
          title: '期限切れタスク',
          priority: 'medium',
          status: 'todo',
          dueDate: '2026-11-08',
          createdAt: '2026-11-01T00:00:00.000Z',
        })
        .run();

      const plan = generateRemediationPlan({ db, now: fixedNow });

      expect(plan.actions).toHaveLength(1);
      expect(plan.actions[0]).toMatchObject({
        taskTitle: '期限切れタスク',
        actionType: 'reschedule',
        currentValue: '2026-11-08',
        proposedValue: '2026-11-12',
      });
      expect(plan.actions[0].reason).toContain('期限切れ');
    });

    it('7日以上滞留している未完了高優先度タスクから adjust_priority アクション（mediumへ変更）を生成する', () => {
      // 8日前作成のhighタスク
      db.insert(tasks)
        .values({
          title: '滞留している重要タスク',
          priority: 'high',
          status: 'in_progress',
          dueDate: '2026-11-20',
          createdAt: '2026-11-02T00:00:00.000Z', // 8日前
        })
        .run();

      const plan = generateRemediationPlan({ db, now: fixedNow });

      expect(plan.actions).toHaveLength(1);
      expect(plan.actions[0]).toMatchObject({
        taskTitle: '滞留している重要タスク',
        actionType: 'adjust_priority',
        currentValue: 'high',
        proposedValue: 'medium',
      });
      expect(plan.actions[0].reason).toContain('7日以上');
    });

    it('同一タスクが期限切れかつ滞留している場合、reschedule と adjust_priority の2アクションを生成する', () => {
      db.insert(tasks)
        .values({
          title: '複合問題タスク',
          priority: 'high',
          status: 'todo',
          dueDate: '2026-11-05',
          createdAt: '2026-11-01T00:00:00.000Z',
        })
        .run();

      const plan = generateRemediationPlan({ db, now: fixedNow });

      expect(plan.actions).toHaveLength(2);
      const actionTypes = plan.actions.map((a) => a.actionType);
      expect(actionTypes).toContain('reschedule');
      expect(actionTypes).toContain('adjust_priority');
    });

    it('完了済み（status: done）のタスクは期限切れや滞留であっても対象外とする', () => {
      db.insert(tasks)
        .values({
          title: '完了済みタスク',
          priority: 'high',
          status: 'done',
          dueDate: '2026-11-01',
          createdAt: '2026-10-01T00:00:00.000Z',
        })
        .run();

      const plan = generateRemediationPlan({ db, now: fixedNow });
      expect(plan.actions).toHaveLength(0);
    });

    it('是正対象が存在しない健全な状態では空のアクション一覧を返す', () => {
      db.insert(tasks)
        .values({
          title: '正常タスク',
          priority: 'low',
          status: 'todo',
          dueDate: '2026-11-15',
          createdAt: '2026-11-09T00:00:00.000Z',
        })
        .run();

      const plan = generateRemediationPlan({ db, now: fixedNow });
      expect(plan.actions).toHaveLength(0);
    });
  });

  describe('applyRemediations', () => {
    it('承認された是正プランをアトミックに適用し、agent_runsを記録し、ステータスがHealthyに復帰する', () => {
      // 健全性判定でcaptureWarningを避けるため、メモを1件用意
      db.insert(captures)
        .values({
          content: '前提知識メモ',
          createdAt: fixedNow.toISOString(),
        })
        .run();

      const inserted = db
        .insert(tasks)
        .values({
          title: '期限切れ重要タスク',
          priority: 'high',
          status: 'todo',
          dueDate: '2026-11-01',
          createdAt: '2026-10-25T00:00:00.000Z',
        })
        .returning({ id: tasks.id })
        .get();

      // 初期プランの生成
      const plan = generateRemediationPlan({ db, now: fixedNow });
      expect(plan.actions.length).toBeGreaterThan(0);

      // 是正の適用
      const result = applyRemediations(plan, { db, now: fixedNow });

      expect(result.appliedCount).toBe(2); // reschedule と adjust_priority
      expect(result.skippedCount).toBe(0);
      expect(result.newReport.status).toBe('healthy');

      // tasks テーブルの更新確認
      const updated = db.select().from(tasks).all().find((t) => t.id === inserted.id);
      expect(updated?.dueDate).toBe('2026-11-12');
      expect(updated?.priority).toBe('medium');

      // agent_runs の記録確認
      const runs = db.select().from(agentRuns).all();
      const remRun = runs.find((r) => r.goal === REMEDIATION_AGENT_GOAL);
      expect(remRun).toBeDefined();
      expect(remRun?.status).toBe('completed');

      // agent_steps の記録確認
      const steps = db
        .select()
        .from(agentSteps)
        .all()
        .filter((s) => s.runId === remRun?.id);
      expect(steps.length).toBeGreaterThanOrEqual(2);

      // 最新のスイープレポートが healthy であること
      const latestSweep = getLatestSweepReport(db);
      expect(latestSweep?.status).toBe('healthy');
    });

    it('タスクの現在値がcurrentValueと不一致（既にユーザーが手動変更）の場合はスキップする', () => {
      const inserted = db
        .insert(tasks)
        .values({
          title: '競合タスク',
          priority: 'medium',
          status: 'todo',
          dueDate: '2026-11-01',
          createdAt: '2026-11-08T00:00:00.000Z',
        })
        .returning({ id: tasks.id })
        .get();

      // プラン生成時の currentValue は '2026-11-01'
      const plan = generateRemediationPlan({ db, now: fixedNow });

      // 直後にユーザーが手動で期日を '2026-11-20' に更新したと仮定
      db.update(tasks)
        .set({ dueDate: '2026-11-20' })
        .where(eq(tasks.id, inserted.id))
        .run();

      const result = applyRemediations(plan, { db, now: fixedNow });
      expect(result.appliedCount).toBe(0);
      expect(result.skippedCount).toBe(1);

      // ユーザーの期日 '2026-11-20' が保持されていること
      const current = db.select().from(tasks).all().find((t) => t.id === inserted.id);
      expect(current?.dueDate).toBe('2026-11-20');
    });

    it('アクションが空の場合はDB更新なしで成功し、現在の健全性レポートを返す', () => {
      const emptyPlan = { actions: [], generatedAt: fixedNow.toISOString() };
      const result = applyRemediations(emptyPlan, { db, now: fixedNow });

      expect(result.appliedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
    });
  });
});

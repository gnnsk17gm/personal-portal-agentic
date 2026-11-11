import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import { tasks, agentRuns } from '@/db/schema';
import {
  runDegradationScenario,
  DEMO_TASK_PREFIX,
} from '@/services/scenarioService';

describe('scenarioService', () => {
  let db: AppDb;
  // 基準日: 2026-11-11
  const fixedNow = new Date('2026-11-11T12:00:00.000Z');

  beforeEach(() => {
    db = createTestDb();
  });

  it('デモタスクを注入し、HealthSweepを実行してCriticalまたはWarning状態と是正プランを生成する', () => {
    const result = runDegradationScenario({ db, now: fixedNow });

    expect(result.injectedCount).toBeGreaterThanOrEqual(2);
    expect(result.sweepStatus).toBe('critical');
    expect(result.remediationPlanCount).toBeGreaterThanOrEqual(2);

    // DB に [Demo] タスクが注入されていること
    const insertedTasks = db.select().from(tasks).all();
    const demoTasks = insertedTasks.filter((t) =>
      t.title.startsWith(DEMO_TASK_PREFIX)
    );
    expect(demoTasks.length).toBe(result.injectedCount);

    // agentRuns に Sweeper Agent の実行記録が作成されていること
    const runs = db.select().from(agentRuns).all();
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.some((r) => r.status === 'completed')).toBe(true);
  });

  it('連続実行しても冪等性が保たれ、前回のDemoタスクが重複せずに再注入される', () => {
    // 1回目の実行
    runDegradationScenario({ db, now: fixedNow });
    const countAfterFirst = db.select().from(tasks).all().length;

    // 2回目の実行
    const result2 = runDegradationScenario({ db, now: fixedNow });
    const countAfterSecond = db.select().from(tasks).all().length;

    // 件数が肥大化せず、再注入された件数と等しいこと
    expect(countAfterSecond).toBe(countAfterFirst);
    expect(countAfterSecond).toBe(result2.injectedCount);
  });
});

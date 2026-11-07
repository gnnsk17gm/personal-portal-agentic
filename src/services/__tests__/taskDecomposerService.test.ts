import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import { createCapture } from '@/services/captureService';
import { createTask as defaultCreateTask, getAllTasks } from '@/services/taskService';
import {
  decomposeGoal,
  getRecentRuns,
  getRunSteps,
  LocalRuleBasedDecomposer,
} from '@/services/taskDecomposerService';

describe('taskDecomposerService', () => {
  let db: AppDb;
  const fixedNow = new Date('2026-11-07T10:00:00Z');

  beforeEach(() => {
    db = createTestDb();
  });

  describe('decomposeGoal', () => {
    it('目標を受け取り、トレースステップを記録し、3〜5件のタスクを自動登録する', () => {
      // ナレッジ登録
      createCapture('職務経歴書には技術スタックと定量成果（売上20%UP等）を明記する', db);
      createCapture('ポートフォリオはNext.jsとTypeScriptで自律エージェントを実演する構成にする', db);

      const goal = '転職用の職歴書とポートフォリオを整備する';
      const result = decomposeGoal(goal, undefined, { db, now: fixedNow });

      // Run の検証
      expect(result.run.goal).toBe(goal);
      expect(result.run.status).toBe('completed');
      expect(result.run.completedAt).not.toBeNull();

      // Steps の検証 (仕様書で定義された4ステップ)
      expect(result.steps.length).toBeGreaterThanOrEqual(4);
      const stepNames = result.steps.map((s) => s.stepName);
      expect(stepNames).toContain('analyze_goal');
      expect(stepNames).toContain('retrieve_knowledge');
      expect(stepNames).toContain('generate_tasks');
      expect(stepNames).toContain('persist_tasks');
      expect(result.steps.every((s) => s.status === 'success')).toBe(true);

      // ナレッジ参照ステップで関連ノート情報が detail に記録されていること
      const retrieveStep = result.steps.find((s) => s.stepName === 'retrieve_knowledge');
      expect(retrieveStep?.detail).toMatch(/ヒット|件|ノート/);

      // 生成タスクの検証 (3〜5件)
      expect(result.createdTasks.length).toBeGreaterThanOrEqual(3);
      expect(result.createdTasks.length).toBeLessThanOrEqual(5);

      // DBにタスクが永続化されていること
      const allTasks = getAllTasks(db);
      expect(allTasks).toHaveLength(result.createdTasks.length);

      // 優先度と期日が適切に設定されていること
      const priorities = result.createdTasks.map((t) => t.priority);
      expect(priorities).toContain('high');
      expect(result.createdTasks.some((t) => t.dueDate !== null)).toBe(true);

      // 相対期日は 2026-11-07 以降の YYYY-MM-DD 形式
      for (const t of result.createdTasks) {
        if (t.dueDate) {
          expect(t.dueDate).toMatch(/^2026-11-\d{2}$/);
        }
      }
    });

    it('ナレッジが0件の場合でも正常にデフォルト分解されて完了する', () => {
      const goal = '未知の新言語Rustの基礎文法を習得する';
      const result = decomposeGoal(goal, undefined, { db, now: fixedNow });

      expect(result.run.status).toBe('completed');
      expect(result.createdTasks.length).toBeGreaterThanOrEqual(3);

      const retrieveStep = result.steps.find((s) => s.stepName === 'retrieve_knowledge');
      expect(retrieveStep?.detail).toMatch(/0件/);
    });

    it('空または空白のみのゴールはエラーとなり、failedトレースが記録される', () => {
      expect(() => decomposeGoal('', undefined, { db, now: fixedNow })).toThrow(/目標を入力してください/);

      const runs = getRecentRuns(10, db);
      expect(runs).toHaveLength(1);
      expect(runs[0].status).toBe('failed');

      const steps = getRunSteps(runs[0].id, db);
      expect(steps.some((s) => s.status === 'error')).toBe(true);
      expect(getAllTasks(db)).toHaveLength(0);
    });

    it('外部課金APIを使わず同一のゴールに対して決定論的（再現可能）なタスクを出力する', () => {
      const goal = '技術記事を執筆してQiitaに公開する';
      const decomposer = new LocalRuleBasedDecomposer();

      const tasksA = decomposer.decompose(goal, [], fixedNow);
      const tasksB = decomposer.decompose(goal, [], fixedNow);

      expect(tasksA).toEqual(tasksB);
      expect(tasksA.length).toBeGreaterThanOrEqual(3);
      expect(tasksA.length).toBeLessThanOrEqual(5);
    });

    it('タスク登録中に障害が発生した場合はロールバックされ、Runがfailedになる', () => {
      const goal = 'プロジェクトの立ち上げ計画を作る';
      const failingCreateTask = () => {
        throw new Error('Simulated DB failure');
      };

      expect(() =>
        decomposeGoal(goal, undefined, {
          db,
          now: fixedNow,
          createTask: failingCreateTask as unknown as typeof defaultCreateTask,
        })
      ).toThrow('Simulated DB failure');

      const runs = getRecentRuns(10, db);
      expect(runs).toHaveLength(1);
      expect(runs[0].status).toBe('failed');

      // タスクは1件も残っていないこと（ロールバック担保）
      expect(getAllTasks(db)).toHaveLength(0);

      const steps = getRunSteps(runs[0].id, db);
      const errorStep = steps.find((s) => s.status === 'error');
      expect(errorStep).toBeDefined();
      expect(errorStep?.stepName).toBe('persist_tasks');
    });
  });

  describe('getRecentRuns & getRunSteps', () => {
    it('直近のRun一覧と、指定Runのステップ一覧を時系列・順序通りに取得できる', () => {
      decomposeGoal('ゴール1', undefined, { db, now: fixedNow });
      decomposeGoal('ゴール2', undefined, { db, now: fixedNow });

      const runs = getRecentRuns(5, db);
      expect(runs).toHaveLength(2);
      expect(runs[0].goal).toBe('ゴール2'); // 新しい順
      expect(runs[1].goal).toBe('ゴール1');

      const steps = getRunSteps(runs[0].id, db);
      expect(steps.length).toBeGreaterThanOrEqual(4);
      expect(steps[0].stepName).toBe('analyze_goal');
    });
  });
});

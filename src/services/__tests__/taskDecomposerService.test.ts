import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import { createCapture } from '@/services/captureService';
import { createTask as defaultCreateTask, getAllTasks } from '@/services/taskService';
import {
  decomposeGoal,
  getRecentRuns,
  getRunSteps,
  LocalRuleBasedDecomposer,
  runResearcher,
  runPlanner,
  runCritic,
} from '@/services/taskDecomposerService';
import type { DecomposedTaskCandidate } from '@/types/portal';

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

  describe('Subagents Unit Tests', () => {
    describe('Researcher', () => {
      it('キーワードを抽出し、検索ヒット件数と最高スコアを含むレポートを生成する', () => {
        createCapture('Next.js App Routerのアーキテクチャ設計に関する技術知見', db);
        const report = runResearcher('Next.js 設計', { db });

        expect(report.agentRole).toBe('researcher');
        expect(report.data.keywords.length).toBeGreaterThan(0);
        expect(report.data.knowledge.length).toBeGreaterThan(0);
        expect(report.data.highestScore).not.toBeNull();
        expect(report.summary).toContain('BM25ナレッジ検索完了');
        expect(report.summary).toContain('最高スコア');
      });

      it('ヒット0件の場合はサマリーに0件と明記される', () => {
        const report = runResearcher('該当なしの珍しいキーワードXYZ123', { db });
        expect(report.agentRole).toBe('researcher');
        expect(report.data.knowledge).toHaveLength(0);
        expect(report.data.highestScore).toBeNull();
        expect(report.summary).toContain('関連ノート0件');
      });
    });

    describe('Planner', () => {
      it('目標とナレッジを受け取り、3〜5件のタスク候補を立案する', () => {
        const report = runPlanner('新しいWebサービスの立ち上げ', [], fixedNow);
        expect(report.agentRole).toBe('planner');
        expect(report.data.length).toBeGreaterThanOrEqual(3);
        expect(report.data.length).toBeLessThanOrEqual(5);
        expect(report.summary).toContain(`タスク候補${report.data.length}件を立案`);
      });
    });

    describe('Critic (Verifier & Self-Correction)', () => {
      it('先頭タスクが medium または low の場合、high へ自己補正する', () => {
        const candidates: DecomposedTaskCandidate[] = [
          { title: '最初のタスク', priority: 'medium', dueDate: '2026-11-08' },
          { title: '次のタスク', priority: 'low', dueDate: '2026-11-10' },
        ];

        const evaluation = runCritic(candidates, fixedNow);

        expect(evaluation.approved).toBe(true);
        expect(evaluation.finalTasks[0].priority).toBe('high');
        expect(evaluation.adjustmentsMade.some((adj) => adj.includes('high'))).toBe(true);
      });

      it('期日が逆転・重複・nullの場合に直前タスク+1日へ自己補正する', () => {
        const candidates: DecomposedTaskCandidate[] = [
          { title: 'タスク1', priority: 'high', dueDate: '2026-11-10' },
          { title: 'タスク2（期日逆転）', priority: 'medium', dueDate: '2026-11-08' },
          { title: 'タスク3（期日重複）', priority: 'medium', dueDate: '2026-11-11' }, // 補正後のタスク2(11-11)と重複
          { title: 'タスク4（期日未設定）', priority: 'low', dueDate: null },
        ];

        const evaluation = runCritic(candidates, fixedNow);

        expect(evaluation.approved).toBe(true);
        expect(evaluation.finalTasks[0].dueDate).toBe('2026-11-10');
        expect(evaluation.finalTasks[1].dueDate).toBe('2026-11-11'); // 10日の翌日
        expect(evaluation.finalTasks[2].dueDate).toBe('2026-11-12'); // 11日の翌日
        expect(evaluation.finalTasks[3].dueDate).toBe('2026-11-13'); // 12日の翌日
        expect(evaluation.adjustmentsMade.length).toBeGreaterThanOrEqual(3);
      });

      it('タスク1の期日がnullの場合は基準日now+1日に補正される', () => {
        const candidates: DecomposedTaskCandidate[] = [
          { title: 'タスク1', priority: 'high', dueDate: null },
          { title: 'タスク2', priority: 'low', dueDate: null },
        ];

        const evaluation = runCritic(candidates, fixedNow);
        expect(evaluation.finalTasks[0].dueDate).toBe('2026-11-08'); // fixedNow(11-07) + 1日
        expect(evaluation.finalTasks[1].dueDate).toBe('2026-11-09');
      });

      it('期日と優先度が完全に正常な場合、調整なし（adjustmentsMadeが空）で承認される', () => {
        const candidates: DecomposedTaskCandidate[] = [
          { title: 'タスク1', priority: 'high', dueDate: '2026-11-08' },
          { title: 'タスク2', priority: 'medium', dueDate: '2026-11-10' },
          { title: 'タスク3', priority: 'low', dueDate: '2026-11-12' },
        ];

        const evaluation = runCritic(candidates, fixedNow);
        expect(evaluation.approved).toBe(true);
        expect(evaluation.adjustmentsMade).toHaveLength(0);
        expect(evaluation.finalTasks).toEqual(candidates);
      });
    });

    describe('Multi-agent Orchestration Trace in decomposeGoal', () => {
      it('各ステップに担当サブエージェントのロールが記録され、Criticの検証ステップが含まれる', () => {
        const goal = 'マルチエージェント協調オーケストレーションの検証';
        const result = decomposeGoal(goal, undefined, { db, now: fixedNow });

        // ステップ数の確認 (analyze_goal, retrieve_knowledge, generate_tasks, critic_review, persist_tasks の5ステップ)
        expect(result.steps).toHaveLength(5);

        // 各ステップのロール確認
        const analyzeStep = result.steps.find((s) => s.stepName === 'analyze_goal');
        const retrieveStep = result.steps.find((s) => s.stepName === 'retrieve_knowledge');
        const generateStep = result.steps.find((s) => s.stepName === 'generate_tasks');
        const criticStep = result.steps.find((s) => s.stepName === 'critic_review');
        const persistStep = result.steps.find((s) => s.stepName === 'persist_tasks');

        expect(analyzeStep?.agentRole).toBe('researcher');
        expect(retrieveStep?.agentRole).toBe('researcher');
        expect(generateStep?.agentRole).toBe('planner');
        expect(criticStep?.agentRole).toBe('critic');
        expect(persistStep?.agentRole).toBe('orchestrator');

        // Critic の思考ログに検証メッセージが含まれる
        expect(criticStep?.detail).toMatch(/All checks passed|Dates corrected/);
      });

      it('期日が逆転したタスク候補を生成するカスタムDecomposerに対してもCriticが介入して正常なタスクを保存する', () => {
        const faultyDecomposer = {
          decompose: () => [
            { title: '逆転タスク1', priority: 'low' as const, dueDate: '2026-11-20' },
            { title: '逆転タスク2', priority: 'medium' as const, dueDate: '2026-11-10' },
          ],
        };

        const result = decomposeGoal('異常タスクの自己修正テスト', undefined, {
          db,
          now: fixedNow,
          decomposer: faultyDecomposer,
        });

        // Critic の検証ステップで自己修正ログが記録されていること
        const criticStep = result.steps.find((s) => s.stepName === 'critic_review');
        expect(criticStep?.detail).toContain('Dates corrected / Adjusted');

        // DBに永続化されたタスクが修正済みであること
        const tasks = getAllTasks(db);
        expect(tasks[0].priority).toBe('high'); // 先頭がhighに修正
        expect(tasks[0].dueDate).toBe('2026-11-20');
        expect(tasks[1].dueDate).toBe('2026-11-21'); // 20日より後の日付に修正
      });
    });
  });
});

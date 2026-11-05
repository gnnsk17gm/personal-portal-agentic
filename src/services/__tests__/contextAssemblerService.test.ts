import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import { createCapture } from '@/services/captureService';
import {
  assembleContext,
  DEFAULT_MAX_CHARS,
} from '@/services/contextAssemblerService';
import { LocalScheduleProvider, type ScheduleProvider } from '@/services/scheduleService';
import { createTask, toggleTaskStatus } from '@/services/taskService';
import type { ScheduleEvent } from '@/types/portal';

describe('contextAssemblerService', () => {
  let db: AppDb;
  let mockScheduleProvider: ScheduleProvider;

  beforeEach(() => {
    db = createTestDb();
    const mockEvents: ScheduleEvent[] = [
      { id: '1', time: '10:00 - 11:00', title: '朝会スプリントレビュー', category: 'meeting' },
      { id: '2', time: '14:00 - 16:00', title: '集中開発タスク', category: 'focus' },
      { id: '3', time: '18:00 - 18:30', title: 'デイリー整理', category: 'personal' },
    ];
    mockScheduleProvider = new LocalScheduleProvider(mockEvents);
  });

  it('未完了タスク・直近ノート・本日の予定を集約し、構造化コンテキストを生成する', () => {
    // タスク投入（未完了2件、完了1件）
    createTask({ title: '高優先度タスクA', priority: 'high', dueDate: '2026-12-01' }, db);
    const completedTask = createTask({ title: 'すでに終わったタスク', priority: 'high' }, db);
    toggleTaskStatus(completedTask.id, db);
    createTask({ title: '通常タスクB', priority: 'medium' }, db);

    // ノート投入
    createCapture('アイデアノート1: LLMを活用したUI改善', db);
    createCapture('アイデアノート2: Vitestによるテスト自動化', db);

    const context = assembleContext(undefined, { db, scheduleProvider: mockScheduleProvider });

    // 統計の検証
    expect(context.stats).toEqual({
      pendingTasksCount: 2,
      highPriorityCount: 1,
      recentNotesCount: 2,
      todayEventsCount: 3,
    });

    // 完了済みタスクが含まれていないこと
    expect(context.markdownPayload).not.toContain('すでに終わったタスク');
    expect(context.markdownPayload).toContain('[HIGH] 高優先度タスクA (期限: 2026-12-01)');
    expect(context.markdownPayload).toContain('[MEDIUM] 通常タスクB');

    // 予定とノートが含まれていること
    expect(context.markdownPayload).toContain('朝会スプリントレビュー');
    expect(context.markdownPayload).toContain('アイデアノート1: LLMを活用したUI改善');

    // サマリー文
    expect(context.summaryText).toContain('未完了タスク2件（うち高優先度1件）、本日の予定3件です。');
    expect(context.summaryText).toContain('高優先度タスクから着手することを推奨します。');
    expect(context.summaryText).toContain('予定が複数入っているため、まとまった集中時間の確保を意識しましょう。');

    // トークン概算と予算内判定
    expect(DEFAULT_MAX_CHARS).toBe(1500);
    expect(context.charCount).toBeLessThanOrEqual(DEFAULT_MAX_CHARS);
    expect(context.charCount).toBe(context.markdownPayload.length);
    expect(context.estimatedTokens).toBe(Math.ceil(context.charCount / 3));
    expect(context.truncated).toBe(false);
  });

  it('タスクが優先度順（high → medium → low）に並ぶ', () => {
    createTask({ title: '低タスク', priority: 'low' }, db);
    createTask({ title: '高タスク', priority: 'high' }, db);
    createTask({ title: '中タスク', priority: 'medium' }, db);

    const context = assembleContext(undefined, { db, scheduleProvider: mockScheduleProvider });
    const payload = context.markdownPayload;

    const highIndex = payload.indexOf('[HIGH] 高タスク');
    const medIndex = payload.indexOf('[MEDIUM] 中タスク');
    const lowIndex = payload.indexOf('[LOW] 低タスク');

    expect(highIndex).toBeGreaterThan(-1);
    expect(medIndex).toBeGreaterThan(highIndex);
    expect(lowIndex).toBeGreaterThan(medIndex);
  });

  it('文字数予算（maxChars）を超過する場合、優先度順で切り詰められ truncated が true になる', () => {
    createTask({ title: '重要なタスク1', priority: 'high' }, db);
    createTask({ title: '重要なタスク2', priority: 'high' }, db);
    createCapture('ノート内容が長々と続くテスト文字列です。'.repeat(10), db);

    // 小さい文字数制限を指定（例: 220文字）
    const smallBudget = 220;
    const context = assembleContext({ maxChars: smallBudget }, { db, scheduleProvider: mockScheduleProvider });

    expect(context.charCount).toBeLessThanOrEqual(smallBudget);
    expect(context.truncated).toBe(true);
    // 高優先度タスクは含まれるが、優先度の低い直近ノートは予算オーバーで落ちる
    expect(context.markdownPayload).toContain('## Pending Tasks');
    expect(context.markdownPayload).not.toContain('ノート内容が長々と続く');
  });

  it('データが空（0件）のときも安全にサマリーとMarkdownを生成できる', () => {
    const emptyProvider: ScheduleProvider = { getTodayEvents: () => [] };
    const context = assembleContext(undefined, { db, scheduleProvider: emptyProvider });

    expect(context.stats).toEqual({
      pendingTasksCount: 0,
      highPriorityCount: 0,
      recentNotesCount: 0,
      todayEventsCount: 0,
    });
    expect(context.summaryText).toContain('未完了タスクはありません。');
    expect(context.markdownPayload).toContain('- None');
    expect(context.truncated).toBe(false);
  });

  describe('タスク駆動型ローカルRAG濃縮 (Task-Driven Local RAG)', () => {
    it('高優先度タスクに関連するノートがBM25で抽出され、enrichedTasksとMarkdownに反映される', () => {
      // ノートを投入
      createCapture('Drizzle ORMのマイグレーション設定方法とSQLiteの注意点', db);
      createCapture('全く関係ない週末の買い出しメモ（牛乳、卵）', db);
      createCapture('Drizzleのスキーマ設計とリレーションベストプラクティス', db);

      // タスク投入
      createTask({ title: 'Drizzle マイグレーション対応', priority: 'high' }, db);

      const context = assembleContext(undefined, { db, scheduleProvider: mockScheduleProvider });

      expect(context.enrichedTasks).toBeDefined();
      expect(context.enrichedTasks.length).toBe(1);

      const enriched = context.enrichedTasks[0];
      expect(enriched.title).toBe('Drizzle マイグレーション対応');
      expect(enriched.relevantNotes).toBeDefined();
      expect(enriched.relevantNotes!.length).toBe(2);
      expect(enriched.relevantNotes![0].content).toContain('Drizzle');
      expect(enriched.relevantNotes![0].score).toBeGreaterThan(0);

      // Markdownペイロードの検証
      expect(context.markdownPayload).toContain('## Priority Tasks with Relevant Knowledge');
      expect(context.markdownPayload).toContain('### Task: [HIGH] Drizzle マイグレーション対応');
      expect(context.markdownPayload).toContain('Relevant Knowledge:');
      expect(context.markdownPayload).toContain('- (Score:');

      // 買い出しメモはRelevant Knowledgeセクションには入らない
      const knowledgeSection = context.markdownPayload
        .split('## Priority Tasks with Relevant Knowledge')[1]
        .split("## Today's Schedule")[0];
      expect(knowledgeSection).not.toContain('買い出しメモ');
    });

    it('関連ノートが存在しない高優先度タスクはKnowledgeセクションに表示されない', () => {
      createCapture('Pythonのデータ分析レシピ', db);
      createTask({ title: 'Next.js App Routerの修正', priority: 'high' }, db);

      const context = assembleContext(undefined, { db, scheduleProvider: mockScheduleProvider });

      expect(context.enrichedTasks.length).toBe(1);
      expect(context.enrichedTasks[0].relevantNotes).toEqual([]);
      expect(context.markdownPayload).not.toContain('## Priority Tasks with Relevant Knowledge');
    });

    it('中・低優先度タスクや完了済みタスクはRAG検索対象外である', () => {
      createCapture('Dockerコンテナの最適化手法', db);

      const completed = createTask({ title: 'Docker 本番ビルド対応', priority: 'high' }, db);
      toggleTaskStatus(completed.id, db);
      createTask({ title: 'Docker 開発環境整備', priority: 'medium' }, db);
      createTask({ title: 'Docker ドキュメント整理', priority: 'low' }, db);

      const context = assembleContext(undefined, { db, scheduleProvider: mockScheduleProvider });

      // 未完了のhighがないため、enrichedTasksは空
      expect(context.enrichedTasks).toEqual([]);
      expect(context.markdownPayload).not.toContain('## Priority Tasks with Relevant Knowledge');
    });

    it('高優先度タスクが4件以上ある場合は上位3件までを検索対象とする', () => {
      createCapture('インデックス設計の基礎', db);
      createTask({ title: 'インデックス最適化 1', priority: 'high' }, db);
      createTask({ title: 'インデックス最適化 2', priority: 'high' }, db);
      createTask({ title: 'インデックス最適化 3', priority: 'high' }, db);
      createTask({ title: 'インデックス最適化 4', priority: 'high' }, db);

      const context = assembleContext(undefined, { db, scheduleProvider: mockScheduleProvider });

      expect(context.enrichedTasks.length).toBe(3);
    });

    it('各タスクに紐づく関連ノートは最大2件に制限される', () => {
      createCapture('Drizzle ノート 1', db);
      createCapture('Drizzle ノート 2', db);
      createCapture('Drizzle ノート 3', db);

      createTask({ title: 'Drizzle 調査', priority: 'high' }, db);

      const context = assembleContext(undefined, { db, scheduleProvider: mockScheduleProvider });
      const enriched = context.enrichedTasks[0];

      expect(enriched.relevantNotes!.length).toBe(2);
    });

    it('ノート本文は改行置換＆80文字に切り詰められてMarkdownに反映される', () => {
      const longNote = 'Drizzle 調査ノウハウの詳細まとめ:\n' + 'あ'.repeat(120);
      createCapture(longNote, db);

      createTask({ title: 'Drizzle 調査', priority: 'high' }, db);

      const context = assembleContext(undefined, { db, scheduleProvider: mockScheduleProvider });

      // Markdown内のKnowledgeセクション内で改行がスペース化され、80文字+...に切り詰められていること
      const knowledgeSection = context.markdownPayload
        .split('## Priority Tasks with Relevant Knowledge')[1]
        .split("## Today's Schedule")[0];
      expect(knowledgeSection).not.toContain('\n' + 'あ'.repeat(120));
      expect(knowledgeSection).toContain('...');
    });

    it('文字数予算（maxChars）が小さい場合、関連ナレッジセクションも含めて安全に切り詰められる', () => {
      createCapture('TypeScript Strictモード設定の勘所', db);
      createTask({ title: 'TypeScript 設定改善', priority: 'high' }, db);

      // 小さい予算
      const smallBudget = 250;
      const context = assembleContext({ maxChars: smallBudget }, { db, scheduleProvider: mockScheduleProvider });

      expect(context.charCount).toBeLessThanOrEqual(smallBudget);
      expect(context.truncated).toBe(true);
    });
  });
});


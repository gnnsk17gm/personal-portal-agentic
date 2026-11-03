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
});

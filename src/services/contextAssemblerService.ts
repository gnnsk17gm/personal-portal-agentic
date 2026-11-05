import { getDb, type AppDb } from '@/db';
import { getRecentCaptures } from '@/services/captureService';
import { defaultScheduleProvider, getTodayEvents, type ScheduleProvider } from '@/services/scheduleService';
import { searchNotes } from '@/services/searchService';
import { getAllTasks } from '@/services/taskService';
import type { AssembledContext, EnrichedTask, ScheduleEvent } from '@/types/portal';

export interface AssembleContextOptions {
  /** AIコンテキストに許容する最大文字数（デフォルト: 1500） */
  maxChars?: number;
}

export interface AssembleContextDeps {
  db?: AppDb;
  scheduleProvider?: ScheduleProvider;
}

export const DEFAULT_MAX_CHARS = 1500;

function generateSummaryText(stats: AssembledContext['stats']): string {
  const parts: string[] = [
    `未完了タスク${stats.pendingTasksCount}件（うち高優先度${stats.highPriorityCount}件）、本日の予定${stats.todayEventsCount}件です。`,
  ];

  if (stats.highPriorityCount > 0) {
    parts.push('高優先度タスクから着手することを推奨します。');
  } else if (stats.pendingTasksCount > 0) {
    parts.push('順調にタスクを進めましょう。');
  } else {
    parts.push('未完了タスクはありません。');
  }

  if (stats.todayEventsCount >= 3) {
    parts.push('予定が複数入っているため、まとまった集中時間の確保を意識しましょう。');
  }

  return parts.join(' ');
}

export function assembleContext(
  options?: AssembleContextOptions,
  deps?: AssembleContextDeps,
): AssembledContext {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const db = deps?.db ?? getDb();
  const scheduleProvider = deps?.scheduleProvider ?? defaultScheduleProvider;

  // 1. データ収集
  const allTasks = getAllTasks(db);
  const pendingTasks = allTasks.filter((t) => t.status !== 'done');
  const highPriorityTasks = pendingTasks.filter((t) => t.priority === 'high');
  const recentNotes = getRecentCaptures(5, db);
  const todayEvents: ScheduleEvent[] = getTodayEvents(scheduleProvider);

  // 1.1 高優先度タスク（上位最大3件）に対するBM25ナレッジ濃縮 (Task-Driven Local RAG)
  const targetHighTasks = highPriorityTasks.slice(0, 3);
  const enrichedTasks: EnrichedTask[] = targetHighTasks.map((task) => {
    const searchResults = searchNotes(task.title, db);
    const scoredMatches = searchResults.filter((note) => (note.score ?? 0) > 0);
    const topMatches = scoredMatches.slice(0, 2).map((note) => ({
      id: note.id,
      content: note.content,
      score: note.score ?? 0,
    }));
    return {
      ...task,
      relevantNotes: topMatches,
    };
  });

  // 2. 統計情報
  const stats: AssembledContext['stats'] = {
    pendingTasksCount: pendingTasks.length,
    highPriorityCount: highPriorityTasks.length,
    recentNotesCount: recentNotes.length,
    todayEventsCount: todayEvents.length,
  };

  // 3. 人間向けサマリー文
  const summaryText = generateSummaryText(stats);

  // 4. Markdownペイロードの構築（セクション優先度: タスク → 関連ナレッジ → 予定 → ノート）
  const headerLines: string[] = [
    '# Personal Portal Context',
    '',
    '## Briefing Summary',
    `- Pending Tasks: ${stats.pendingTasksCount} (High Priority: ${stats.highPriorityCount})`,
    `- Today's Schedule Events: ${stats.todayEventsCount}`,
    `- Recent Second Brain Notes: ${stats.recentNotesCount}`,
    '',
  ];

  let currentText = headerLines.join('\n');
  let truncated = false;

  if (currentText.length > maxChars) {
    currentText = currentText.slice(0, maxChars);
    truncated = true;
  } else {
    // セクション1: 未完了タスク
    const taskLines: string[] = ['## Pending Tasks'];
    if (pendingTasks.length === 0) {
      taskLines.push('- None');
    } else {
      for (const t of pendingTasks) {
        const due = t.dueDate ? ` (期限: ${t.dueDate})` : '';
        taskLines.push(`- [${t.priority.toUpperCase()}] ${t.title}${due}`);
      }
    }
    taskLines.push('');

    // セクション1.5: タスク関連ナレッジ (関連ノートが1件以上あるタスクのみ出力)
    const tasksWithNotes = enrichedTasks.filter((t) => t.relevantNotes && t.relevantNotes.length > 0);
    const knowledgeLines: string[] = [];
    if (tasksWithNotes.length > 0) {
      knowledgeLines.push('## Priority Tasks with Relevant Knowledge');
      for (const t of tasksWithNotes) {
        knowledgeLines.push(`### Task: [${t.priority.toUpperCase()}] ${t.title}`);
        knowledgeLines.push('- Relevant Knowledge:');
        for (const note of t.relevantNotes!) {
          const clean = note.content.replace(/\r?\n/g, ' ').trim();
          const snippet = clean.length > 80 ? `${clean.slice(0, 80)}...` : clean;
          knowledgeLines.push(`  - (Score: ${note.score}) ${snippet}`);
        }
      }
      knowledgeLines.push('');
    }

    // セクション2: 本日の予定
    const eventLines: string[] = ["## Today's Schedule"];
    if (todayEvents.length === 0) {
      eventLines.push('- None');
    } else {
      for (const e of todayEvents) {
        eventLines.push(`- ${e.time}: ${e.title} [${e.category}]`);
      }
    }
    eventLines.push('');

    // セクション3: 直近ノート
    const noteLines: string[] = ['## Recent Second Brain Notes'];
    if (recentNotes.length === 0) {
      noteLines.push('- None');
    } else {
      for (const n of recentNotes) {
        const cleanContent = n.content.replace(/\r?\n/g, ' ').trim();
        noteLines.push(`- ${cleanContent}`);
      }
    }
    noteLines.push('');

    const sections = [taskLines, knowledgeLines, eventLines, noteLines];

    for (const section of sections) {
      if (truncated) break;
      for (const line of section) {
        const candidate = currentText.endsWith('\n') || currentText.length === 0
          ? `${currentText}${line}\n`
          : `${currentText}\n${line}\n`;
        if (candidate.length > maxChars) {
          truncated = true;
          break;
        }
        currentText = candidate;
      }
    }
  }

  const finalPayload = currentText.trimEnd();
  const charCount = finalPayload.length;
  const estimatedTokens = Math.ceil(charCount / 3);

  return {
    summaryText,
    stats,
    todayEvents,
    enrichedTasks,
    markdownPayload: finalPayload,
    charCount,
    estimatedTokens,
    truncated,
  };
}


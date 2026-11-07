import { desc, asc, eq } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db';
import { agentRuns, agentSteps } from '@/db/schema';
import { createTask as defaultCreateTask } from '@/services/taskService';
import { searchNotes as defaultSearchNotes, tokenizeText } from '@/services/searchService';
import type {
  AgentRunPreview,
  AgentStepPreview,
  DecomposedTaskCandidate,
  DecompositionResult,
  ScoredCapture,
  TaskPreview,
} from '@/types/portal';

export interface TaskDecompositionProvider {
  decompose(goal: string, knowledge: ScoredCapture[], now: Date): DecomposedTaskCandidate[];
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * 外部APIや課金なしで動作する完全ローカル・決定論的タスク分解エンジン。
 */
export class LocalRuleBasedDecomposer implements TaskDecompositionProvider {
  decompose(goal: string, knowledge: ScoredCapture[], now: Date): DecomposedTaskCandidate[] {
    const lowerGoal = goal.toLowerCase();

    // 意図の分類
    const isJobChange = /転職|職歴|職務|キャリア|面接|履歴書/.test(lowerGoal);
    const isWriting = /執筆|記事|ブログ|qiita|zenn|本|文章/.test(lowerGoal);
    const isTechStudy = /学習|習得|勉強|チュートリアル|言語|rust|go|python|react/.test(lowerGoal);

    // 参照ナレッジの要約スニペット
    const firstKnowledgeSnippet = knowledge.length > 0
      ? knowledge[0].content.trim().slice(0, 30)
      : null;

    const candidates: DecomposedTaskCandidate[] = [];

    if (isJobChange) {
      candidates.push({
        title: `【目標分析】${goal} の要件整理とゴール明確化`,
        priority: 'high',
        dueDate: formatDate(addDays(now, 1)),
      });
      candidates.push({
        title: firstKnowledgeSnippet
          ? `職務経歴書の棚卸し（ナレッジ参照: ${firstKnowledgeSnippet}…）`
          : '職務経歴書の棚卸しと実績数値のリストアップ',
        priority: 'high',
        dueDate: formatDate(addDays(now, 3)),
      });
      candidates.push({
        title: 'ポートフォリオおよびGitHub成果物の選定・見直し',
        priority: 'medium',
        dueDate: formatDate(addDays(now, 5)),
      });
      candidates.push({
        title: '推薦文・自己PR文の推敲と全体レビュー完了',
        priority: 'low',
        dueDate: formatDate(addDays(now, 7)),
      });
    } else if (isWriting) {
      candidates.push({
        title: `【構成案】${goal} のアウトライン作成`,
        priority: 'high',
        dueDate: formatDate(addDays(now, 1)),
      });
      candidates.push({
        title: firstKnowledgeSnippet
          ? `本文執筆（ナレッジ反映: ${firstKnowledgeSnippet}…）`
          : '本文ドラフトの執筆とコードサンプルの作成',
        priority: 'medium',
        dueDate: formatDate(addDays(now, 3)),
      });
      candidates.push({
        title: '校正・推敲および図表・見出しの最終調整',
        priority: 'low',
        dueDate: formatDate(addDays(now, 4)),
      });
    } else if (isTechStudy) {
      candidates.push({
        title: `【入門】${goal} の公式ドキュメント・チュートリアル読了`,
        priority: 'high',
        dueDate: formatDate(addDays(now, 2)),
      });
      candidates.push({
        title: firstKnowledgeSnippet
          ? `ミニプロジェクト実装（参考: ${firstKnowledgeSnippet}…）`
          : '小さなプロトタイプ／ハンズオン課題の実装',
        priority: 'medium',
        dueDate: formatDate(addDays(now, 4)),
      });
      candidates.push({
        title: '学んだ知見のメモまとめ・Second Brainへの蓄積',
        priority: 'low',
        dueDate: formatDate(addDays(now, 6)),
      });
    } else {
      // 汎用タスク分解（3〜4ステップ）
      candidates.push({
        title: `【準備】${goal} の現状分析と要件定義`,
        priority: 'high',
        dueDate: formatDate(addDays(now, 1)),
      });
      candidates.push({
        title: firstKnowledgeSnippet
          ? `主要タスクの実行（参照ナレッジ: ${firstKnowledgeSnippet}…）`
          : `主要ステップの具現化と検証`,
        priority: 'medium',
        dueDate: formatDate(addDays(now, 3)),
      });
      candidates.push({
        title: `【仕上げ】${goal} の完了確認と振り返り`,
        priority: 'low',
        dueDate: formatDate(addDays(now, 5)),
      });
    }

    return candidates;
  }
}

export interface DecomposeOptions {
  maxKnowledgeDocs?: number;
}

export interface DecomposeDeps {
  db?: AppDb;
  now?: Date;
  decomposer?: TaskDecompositionProvider;
  searchNotes?: typeof defaultSearchNotes;
  createTask?: typeof defaultCreateTask;
}

function recordStep(
  db: AppDb,
  runId: number,
  stepName: string,
  status: 'success' | 'error',
  detail: string,
  nowIso: string
): AgentStepPreview {
  return db
    .insert(agentSteps)
    .values({
      runId,
      stepName,
      status,
      detail,
      createdAt: nowIso,
    })
    .returning()
    .get();
}

/**
 * 抽象的な目標を受け取り、ナレッジを参照しながら具象タスク群に自律分解・登録する。
 * 実行トレース（Run & Steps）をDBに永続化する。
 */
export function decomposeGoal(
  rawGoal: string,
  options?: DecomposeOptions,
  deps?: DecomposeDeps
): DecompositionResult {
  const db = deps?.db ?? getDb();
  const now = deps?.now ?? new Date();
  const nowIso = now.toISOString();
  const decomposer = deps?.decomposer ?? new LocalRuleBasedDecomposer();
  const searchNotesFn = deps?.searchNotes ?? defaultSearchNotes;
  const createTaskFn = deps?.createTask ?? defaultCreateTask;
  const maxKnowledgeDocs = options?.maxKnowledgeDocs ?? 3;

  const goal = (rawGoal ?? '').trim();

  // 1. Run の作成 (初期ステータス: running)
  const initialRun = db
    .insert(agentRuns)
    .values({
      goal: goal.length > 0 ? goal : '(空の目標)',
      status: 'running',
      createdAt: nowIso,
      completedAt: null,
    })
    .returning()
    .get();

  const runId = initialRun.id;
  const recordedSteps: AgentStepPreview[] = [];

  // バリデーション
  if (goal.length === 0) {
    const errorStep = recordStep(
      db,
      runId,
      'analyze_goal',
      'error',
      'バリデーション失敗: 目標を入力してください',
      nowIso
    );
    recordedSteps.push(errorStep);

    db.update(agentRuns)
      .set({ status: 'failed', completedAt: nowIso })
      .where(eq(agentRuns.id, runId))
      .run();

    throw new Error('目標を入力してください');
  }

  try {
    // 2. analyze_goal
    const tokens = tokenizeText(goal);
    const keywords = tokens.slice(0, 5).join(', ');
    const analyzeDetail = `目標文の構文解析完了。抽出キーワード: [${keywords || 'なし'}]`;
    recordedSteps.push(recordStep(db, runId, 'analyze_goal', 'success', analyzeDetail, nowIso));

    // 3. retrieve_knowledge
    const searchResults = searchNotesFn(goal, db);
    const relevantKnowledge = searchResults.slice(0, maxKnowledgeDocs);
    const retrieveDetail = relevantKnowledge.length > 0
      ? `BM25ナレッジ検索完了: ${relevantKnowledge.length}件ヒット (最上位ID: ${relevantKnowledge[0].id})`
      : 'BM25ナレッジ検索完了: 関連ノート0件（汎用知識のみで分解します）';
    recordedSteps.push(recordStep(db, runId, 'retrieve_knowledge', 'success', retrieveDetail, nowIso));

    // 4. generate_tasks
    const taskCandidates = decomposer.decompose(goal, relevantKnowledge, now);
    const generateDetail = `タスク候補${taskCandidates.length}件を生成: [${taskCandidates.map((t) => t.title).join(' / ')}]`;
    recordedSteps.push(recordStep(db, runId, 'generate_tasks', 'success', generateDetail, nowIso));

    // 5. persist_tasks
    const createdTasks: TaskPreview[] = [];
    try {
      // Drizzle ORM の transaction を使用してアトミックに永続化
      const persistedList = db.transaction((tx) => {
        const persisted: TaskPreview[] = [];
        for (const candidate of taskCandidates) {
          const task = createTaskFn(candidate, tx as unknown as AppDb);
          persisted.push(task);
        }
        return persisted;
      });

      createdTasks.push(...persistedList);
    } catch (persistErr) {
      const errorMsg = persistErr instanceof Error ? persistErr.message : String(persistErr);
      recordStep(db, runId, 'persist_tasks', 'error', `タスク登録中にエラー: ${errorMsg}`, nowIso);
      db.update(agentRuns)
        .set({ status: 'failed', completedAt: nowIso })
        .where(eq(agentRuns.id, runId))
        .run();
      throw persistErr;
    }

    const persistDetail = `${createdTasks.length}件のタスクをデータベースへ永続化完了`;
    recordedSteps.push(recordStep(db, runId, 'persist_tasks', 'success', persistDetail, nowIso));

    // Run を completed に更新
    const completedAt = new Date().toISOString();
    const finalRun = db
      .update(agentRuns)
      .set({ status: 'completed', completedAt })
      .where(eq(agentRuns.id, runId))
      .returning()
      .get();

    return {
      run: finalRun,
      steps: recordedSteps,
      createdTasks,
    };
  } catch (err) {
    // 既に status が failed になっていない場合、failed に更新
    const currentRun = db.select().from(agentRuns).where(eq(agentRuns.id, runId)).get();
    if (currentRun && currentRun.status === 'running') {
      db.update(agentRuns)
        .set({ status: 'failed', completedAt: new Date().toISOString() })
        .where(eq(agentRuns.id, runId))
        .run();
    }
    throw err;
  }
}

/**
 * 直近の Agent 実行ログを取得する（新しい順）。
 */
export function getRecentRuns(limit = 10, db: AppDb = getDb()): AgentRunPreview[] {
  return db
    .select()
    .from(agentRuns)
    .orderBy(desc(agentRuns.createdAt), desc(agentRuns.id))
    .limit(limit)
    .all();
}

/**
 * 特定の Run に紐づくステップ一覧を時系列順に取得する。
 */
export function getRunSteps(runId: number, db: AppDb = getDb()): AgentStepPreview[] {
  return db
    .select()
    .from(agentSteps)
    .where(eq(agentSteps.runId, runId))
    .orderBy(asc(agentSteps.id))
    .all();
}

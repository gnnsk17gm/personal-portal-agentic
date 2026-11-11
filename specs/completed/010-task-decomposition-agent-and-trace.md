# Spec 010: 自律型タスク分解エージェント（Task Decomposition Agent）と実行トレース基盤の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. ユーザーが入力した抽象的な目標（Goal）を受け取り、関連ナレッジ（Second Brain）を自動参照しながら、優先度・期日付きの具象タスク群に自律分解・登録するエージェント機能を実装するため。
  2. エージェントが実行した一連のワークフロー（計画策定、ナレッジ検索、タスク生成、DB反映）のステップログ（Execution Trace）をDBに記録し、UI上で「エージェントの思考過程」を可視化するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0008-agent-workflow-and-execution-trace.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **エージェント実行トレースのDB永続化:**
  - `agent_runs`（実行ID、ゴール名、ステータス: `running` | `completed` | `failed`、作成日時）テーブルおよび `agent_steps`（Run ID、ステップ名、ステータス、入力/出力サマリー、実行順序）テーブルが SQLite に追加されること。
- [ ] **タスク分解エンジン (`src/services/taskDecomposerService.ts`):**
  - `decomposeGoal(goal: string, options?, deps?)` を実装すること。
  - 目標テキストからキーワードを抽出し、`searchNotes`（BM25）を実行して関連ナレッジを取得するステップを記録すること。
  - 関連ナレッジと目標を踏まえ、複数の具体的タスク（3〜5件程度：タイトル、優先度、相対期日）を生成するステップを記録すること。
  - 生成されたタスクを `createTask` で自動登録し、Runを `completed` に更新すること。
  - 外部課金APIは一切使用せず、決定論的な `LocalRuleBasedDecomposer`（またはルールベース分解器）をデフォルトとして動作させること。
- [ ] **エージェント実行 & トレース可視化 UI (`/tasks` または `/agent`):**
  - 「Goal Decomposition Agent（目標自動分解）」の入力フォームがあり、ゴール（例: `転職用の職歴書とポートフォリオを整備する`）を入力して実行できること。
  - 実行後、生成されたタスクが即座にタスク一覧に反映されること。
  - エージェントの直近の実行ログ（Run一覧と、各ステップの思考・実行履歴：タイムラインまたはアコーディオン）が確認できること。
- [ ] **単体テストと品質ゲート:**
  - `src/services/__tests__/taskDecomposerService.test.ts` が作成され、トレース記録、ナレッジ参照、タスク自動生成の単体テストがすべてパスすること。
  - `npm run verify`（ESLint + TypeCheck + Vitest）がエラーゼロで Green であること。

## 3. 技術設計 (Technical Design)
### 3.1 データベーススキーマの拡張 (`src/db/schema.ts`)
```typescript
export const agentRuns = sqliteTable('agent_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  goal: text('goal').notNull(),
  status: text('status', { enum: ['running', 'completed', 'failed'] }).notNull().default('running'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

export const agentSteps = sqliteTable('agent_steps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: integer('run_id').notNull(),
  stepName: text('step_name').notNull(), // 例: "analyze_goal", "retrieve_knowledge", "generate_tasks", "persist_tasks"
  status: text('status', { enum: ['success', 'error'] }).notNull().default('success'),
  detail: text('detail').notNull(),       // 思考内容や結果サマリー
  createdAt: text('created_at').notNull(),
});

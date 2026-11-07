# Phase 3 / Day 1: 自律型タスク分解エージェント & 実行トレース（Observability）の実装（Spec 010 & ADR 0008）

Phase 2 では、コンテキスト構築、類似度検索（BM25）、MCPエンドポイントという「エージェントのための手足とツール」を整備しました。

Phase 3（自律型エージェント機能 & バックグラウンド自動化）の第1弾となる本日は、ユーザーが入力した抽象的なゴール（例:「転職ポートフォリオの完成」「Next.js 16のVitest環境構築」）を、**エージェントが過去のSecond Brainノートを自律探索しながら、優先度と期限付きの具象タスク群へと自動分解（Plan & Decompose）し、その思考・実行過程をDBへ記録・可視化するパイプライン** を構築します。

もちろん、**外部の有料API課金は一切不要（完全0円）** で、ローカル完結・100%単体テスト可能な設計を貫きます。

---

## 1\. なぜ「タスク分解エージェント & トレース基盤」が転職で高く評価されるのか？

現在、AIエージェントの採用市場で最も注視されているのが **「Plan-and-Execute（計画と実行）パターンの実装力」** と **「Agent Observability（エージェントの可観測性・ログ監査）」** です。

* **一般的な開発者のポートフォリオ:** 「ChatGPT APIにプロンプトを投げて、返ってきた文字列を表示しただけ（裏で何が起きているかブラックボックス）」  
* **あなた（本プロジェクト）のポートフォリオ:**  
  1. **自律的ゴール分解 (Autonomous Decomposition):** 抽象的なゴールからキーワードを抽出 ➔ 関連するSecond Brainノートを自律検索（RAG） ➔ 依存関係と優先度を考慮した実行可能タスク群へと構造化。  
  2. **エージェント・オブザーバビリティ (Agent Observability):** エージェントの各ステップ（`planning` ➔ `retrieving` ➔ `decomposing` ➔ `persisting`）の思考・ツール実行結果を `agent_runs` / `agent_steps` に永続化し、画面上でグラフィカルに監査可能。  
  3. **プロバイダ抽象化 (Provider Pattern):** 外部課金APIがなくても即座に動く決定論的ローカルエンジン（`LocalRuleBasedDecomposer`）を標準搭載し、将来的にローカルLLM（Ollama等）や商用LLMへ1行で差し替え可能な疎結合アーキテクチャ。

---

## 2\. Phase 3 / Day 1 の到達目標（Definition of Done）

- [ ] エージェント実行トレースとタスク分解の設計根拠を記した `docs/adr/0008-agent-workflow-and-execution-trace.md` を作成する  
- [ ] 自律分解とトレース可視化の仕様書 `specs/active/010-task-decomposition-agent-and-trace.md` を作成する  
- [ ] Antigravity に Implementation Plan を出力させ、レビュー・承認する  
- [ ] `npm run verify`（全テストGreen）をパスさせる  
- [ ] `/agent` またはダッシュボードからゴールを入力して実行すると、タスクが自動登録され、実行ステップ（トレース）が視覚的に確認できることを検証する

---

## 3\. 意思決定の記録：ADR 0008 の作成

まずはアーキテクトとして、エージェントワークフローの設計方針をADRとして定義します。

### File 1: `docs/adr/0008-agent-workflow-and-execution-trace.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0008: Plan-and-Execute型エージェントワークフローと実行トレース（Observability）の採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-07
- **決定者:** Project Architect

## 1. コンテキスト (Context)
ポータル利用者が「技術記事を執筆する」「転職活動の職歴書を作成する」などの大きな目標を立てた際、それを自力でブレイクダウンするのは認知負荷が高い。
エージェントが目標を解析し、ポータル内の過去ナレッジ（Second Brain）を自動参照した上で、優先度と期日を持った実行可能な複数タスクへ自動分解・登録する機能が求められる。
また、エージェントが「どのような手順で考え、どの知識を参照し、なぜそのタスクを生成したのか」という推論プロセスを人間が検証・監査できる可観測性（Observability）が不可欠である。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: 外部LLMに単一プロンプトでタスクJSONを一括生成させる（ブラックボックス）**
  - 実装は平易だが、外部API課金が発生し、推論途中のエラー検知やテスト・監査が困難。
- **Option 2: 抽象化されたDecomposer Provider + ステップ実行トレース（Run & Steps）のDB永続化**
  - 分解ロジックを `TaskDecompositionProvider` で抽象化し、実行ライフサイクル（`started` -> `retrieving` -> `generated` -> `completed`）を構造化ログとして記録。デフォルトは外部課金0円のローカル推論エンジンとする。

## 3. 決定内容 (Decision)
**Option 2（Provider抽象化 + 実行トレースDB永続化）を採用する。**

### 選定理由:
1. **完全無料・決定論的テストの担保:**
   - 外部LLMに依存しない `LocalRuleBasedDecomposer` をデフォルト備えることで、CIや採用面接の場でも課金・APIキー不要で100%安定して動作・テスト可能。
2. **Agent Observability（可観測性）の確立:**
   - エージェントの実行単位（Run）と各ステップ（Step）の所要時間・状態・入出力をテーブルに永続化することで、UI上でエージェントの「思考プロセス」を透明に可視化できる。
3. **既存RAG / サービス資産のフル活用:**
   - 目標キーワードに基づくBM25検索（`searchNotes`）とタスク作成（`createTask`）を自律オーケストレーションする。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - 面接で「エージェントの推論プロセスの透明化（XAI / Observability）」を実演できる。
  - 将来ローカルLLM（Ollama）やクラウドLLM（OpenAI/Gemini/Claude）に差し替える際も、トレース基盤をそのまま再利用できる。
- **トレードオフ (Negative):**
  - トレース管理用のDBテーブル（`agent_runs`, `agent_steps` 等）が追加され、スキーマ定義が増加する。
```

&nbsp;

---

## 4\. 自律型タスク分解 & トレースの仕様書（Spec 010）

続いて、エージェントに実装させる仕様書を作成します。

### File 2: `specs/active/010-task-decomposition-agent-and-trace.md`

以下の内容でファイルを作成してください。

```markdown
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
```

&nbsp;

### 3.2 サービス設計 (`src/services/taskDecomposerService.ts`)

- `decomposeGoal(goal: string, deps?: { db?: AppDb, searchNotesFn?, createTaskFn? })`  
- ステップ1: Run作成 & `analyze_goal` 記録  
- ステップ2: 目標からキーワード抽出 & `retrieve_knowledge`（BM25検索）  
- ステップ3: `generate_tasks`（ナレッジを考慮した3〜5件のサブタスク決定）  
- ステップ4: `persist_tasks`（タスク保存 & 完了更新）

### 3.3 作成・変更予定ファイル

- `src/db/schema.ts` (変更: `agentRuns`, `agentSteps` テーブル追加)  
- `src/db/index.ts` (変更: 新規テーブルのマイグレーション/作成対応)  
- `src/services/taskDecomposerService.ts` (新規: タスク分解 & トレース管理サービス)  
- `src/services/__tests__/taskDecomposerService.test.ts` (新規: 単体テスト)  
- `src/app/actions.ts` (変更: `decomposeGoalAction` の追加)  
- `src/components/tasks/GoalDecomposeForm.tsx` (新規: ゴール入力 & 実行ボタン)  
- `src/components/agent/AgentTraceViewer.tsx` (新規: エージェントの実行ステップタイムライン表示)  
- `src/app/tasks/page.tsx` または `src/app/agent/page.tsx` (変更: UI統合)

## 4\. 検証手順 (Verification Steps)

1. `npm run verify` がすべてエラーなしでパスすること。  
2. ブラウザでゴール「`ポートフォリオの完成と技術記事の執筆`」を入力してエージェントを実行。  
3. タスク一覧に自動分解されたタスクが追加され、エージェントトレース画面で各ステップ（解析 \-\> 検索 \-\> 生成 \-\> 登録）の思考ログが表示されることを確認。

````

---

## 5. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0008-agent-workflow-and-execution-trace.md` と `specs/active/010-task-decomposition-agent-and-trace.md`）を作成・保存したら、Antigravity のチャット欄に以下のプロンプトを入力して送信してください。

### 💬 エージェントへの指示プロンプト（コピペ用）

```text
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0008-agent-workflow-and-execution-trace.md の設計判断を踏まえた上で、
@specs/active/010-task-decomposition-agent-and-trace.md の仕様を実装してください。

外部API課金は一切行わず、決定論的なローカルエンジンで完結させてください。
まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
````

&nbsp;
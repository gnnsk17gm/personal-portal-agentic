# Spec 011: 階層型マルチエージェント（Researcher / Planner / Critic）によるタスク分解と検証パイプラインの実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. Spec 010 で構築した単一エージェントを、3つの自律サブエージェント（Researcher, Planner, Critic）による協調オーケストレーション型へアップグレードするため。
  2. Planner が立案したタスク候補に対して、Critic サブエージェントが「相対期日の論理順序」や「優先度の配分」を厳密に監査し、不整合があれば自己修正（Refinement）してDBに永続化するため。
  3. `/tasks` の実行タイムライン（Agent Timeline）において、各ステップを実行した「担当サブエージェント（Researcher / Planner / Critic）」のバッジを表示し、推論の役割分担を可視化するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0009-multi-agent-orchestration-and-critic.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **3つの専門Subagentの責務分離 (`src/services/taskDecomposerService.ts` 等):**
  - **Researcher:** 目標からキーワードを抽出し、`searchNotes`（BM25）を実行して関連ノートを構造化サマリーとしてまとめる（思考ログにヒット件数と最高スコアを記録）。
  - **Planner:** 目標と Researcher の調査レポートに基づき、3〜5件のタスク候補（タイトル、仮の優先度、仮の期日）を立案する。
  - **Critic (Verifier):** Planner のタスク候補を検証し、以下のルールを自動補正（Self-Correction）する：
    1. 期日の整合性チェック: タスク1 -> タスク2 -> タスク3 の期日が時系列順（昇順）になっているか確認し、逆転していれば正しく並び替える/再計算する。
    2. 優先度チェック: 最初のタスクが必ず `high` で始まっているかを確認し、不整合があれば補正する。
    3. Critic の検証結果（合格、または修正内容）を思考ログに明記する。
- [ ] **実行トレース（`agent_steps`）の拡張:**
  - 各ステップの詳細（または新設カラム/JSON）に、担当エージェントのロール（`researcher`, `planner`, `critic`, `orchestrator`）が識別できる情報を含めること。
- [ ] **UIの可視化（`/tasks` の AgentRunTimeline）:**
  - 実行トレースの各ステップに、担当サブエージェントのバッジ（例: `🔍 Researcher`, `📐 Planner`, `⚖️ Critic`）が表示されること。
  - Critic がタスクを検証・補正したログ（「All checks passed」や「Dates corrected」等）が確認できること。
- [ ] **単体テストと品質ゲート:**
  - Researcher、Planner、Critic 単体およびオーケストレーション全体の単体テストが追加されること。
  - 期日が逆転したタスク案を Critic が自動修正するテストケースが含まれること。
  - `npm run verify`（ESLint + TypeCheck + Vitest）がすべてエラーゼロで Green であること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- なし（Pure TypeScript による決定論的アルゴリズム）。

### 3.2 サブエージェント構造設計案
```typescript
export interface SubagentReport<T> {
  agentRole: 'researcher' | 'planner' | 'critic' | 'orchestrator';
  summary: string;
  data: T;
}

// Criticによる検証・補正結果
export interface CriticEvaluation {
  approved: boolean;
  adjustmentsMade: string[];
  finalTasks: DecomposedTaskCandidate[];
}
```

### 3.3 作成・変更予定ファイル
- `src/types/portal.ts` (変更: Subagent関連の型、Critic判定型の追加)
- `src/services/taskDecomposerService.ts` (変更: Researcher / Planner / Critic のクラスまたは関数への責務分割とオーケストレーション)
- `src/services/__tests__/taskDecomposerService.test.ts` (変更: Criticの自己修正テスト、各Subagentの単体テスト追加)
- `src/components/agent/AgentRunTimeline.tsx` (変更: サブエージェントのロールバッジ表示、Criticの検証結果の表示)

## 4. 検証手順 (Verification Steps)
1. `npm run verify`（全テストGreen）を達成すること。
2. ブラウザで `/tasks` を開き、目標を入力して「Decompose Goal」を実行。
3. タイムラインを展開し、以下の流れが色分けバッジ付きで表示されることを確認：
   - 🔍 Researcher: 目標分析とナレッジ検索
   - 📐 Planner: タスク候補の立案
   - ⚖️ Critic: 期限順序と優先度バランスの監査・承認
   - 🚀 Orchestrator: トランザクション永続化

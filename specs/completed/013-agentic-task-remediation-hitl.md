# Spec 013: 自律自己修復エージェント（Self-Healing Remediation）と Human-in-the-loop (HITL) 承認の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. Spec 012 で検知された不健全タスク（期限切れ、高優先度滞留）に対し、エージェントが具体的な「是正プラン（再スケジュール日付・優先度調整）」を自律提案するため。
  2. 勝手にデータを書き換えるリスクを防ぐため、人間がUI上で提案差分を確認し、ワンクリックで安全に是正を適用できる「Human-in-the-loop (HITL)」ガードレールを構築するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0011-self-healing-remediation-and-hitl.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [x] **是正プラン生成ロジック (`src/services/remediationService.ts` または `sweeperService.ts` 拡張):**
  - 期限切れの未完了タスクに対し、現在日を基準とした論理的な新規期日（例: `now + 2日` 等）の修正案（`RemediationAction`）を生成できること。
  - 7日以上滞留している高優先度タスクに対し、優先度調整または再確認の是正案を生成できること。
- [x] **是正適用エンジン (`applyRemediations(plan, deps)`):**
  - 人間が承認した是正プランを一括でデータベース（`tasks` テーブル）にアトミック反映（トランザクション）できること。
  - 適用後、`agent_runs` に `goal: "Task Remediation Execution (HITL Approved)"` として実行ログを永続化すること。
  - 適用後、再度ヘルスチェックが自動実行（または再計算）され、ステータスが **🟢 Healthy** に復帰すること。
- [x] **UIの統合 (`SystemHealthCard.tsx`):**
  - 警告（Warning / Critical）時、カード内に「AI是正提案（例: 『期限切れタスク 1件 を 2日後にリスケジュール』）」のリストが表示されること。
  - 提案の横に「✨ Apply Remediation（是正を適用）」ボタンが表示され、クリックすると Server Action 経由で即座に適用・画面更新（`revalidatePath('/')`）されること。
  - 健全（Healthy）時にはこのボタンや提案リストは非表示（または完了表示）となること。
- [x] **単体テストと品質ゲート:**
  - 是正プラン生成、トランザクション適用、適用後のHealthy復帰を検証する単体テストが追加されること。
  - `npm run verify`（ESLint + TypeCheck + Vitest）がすべてエラーゼロでパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 データ型定義 (`src/types/portal.ts` への追加)
```typescript
export interface RemediationAction {
  taskId: number;
  taskTitle: string;
  actionType: 'reschedule' | 'adjust_priority';
  currentValue: string | null;
  proposedValue: string;
  reason: string;
}

export interface RemediationPlan {
  actions: RemediationAction[];
  generatedAt: string;
}
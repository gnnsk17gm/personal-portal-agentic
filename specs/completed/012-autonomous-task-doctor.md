# Spec 012: 自律監視バックグラウンドエージェント（Task Doctor & Health Check）の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. ユーザーの能動的な操作を待たず、ポータル内の状態（期限切れタスク、未完了タスクの滞留、未整理メモ）を自律点検（Sweep）し、是正アドバイスを自動生成するプロアクティブエージェントを構築するため。
  2. 自動巡回の実行履歴を `agent_runs` に記録し、ダッシュボード上に「エージェントによる最新診断結果（Health Status）」を可視化するため。
  3. 外部CronやGitHub Actions等から呼び出せる HTTP エンドポイント（`POST /api/agent/sweep`）と、画面上の「Run Health Check」即時実行ボタンを提供する。
- **参照すべきADR・スキル:**
  - `docs/adr/0010-autonomous-sweeper-and-scheduled-agent.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **自律巡回エンジン (`src/services/sweeperService.ts`):**
  - `runHealthSweep(deps?)` 関数を実装すること（DI可能）。
  - 以下の3つの観点でシステムを点検し、診断レポート（`SweepReport`）を生成すること：
    1. **Overdue Check:** 期限切れ（`dueDate < today`）の未完了タスク件数と対象タイトルを検出。
    2. **Stale Task Check:** 高優先度（`high`）のまま長期間滞留しているタスクの検出。
    3. **Capture Health:** 未完了タスクに対してSecond Brain（メモ）が適切に存在しているかのチェック。
  - 総合判定ステータス（`healthy` | `warning` | `critical`）と改善サマリー文を算出すること。
  - 実行結果を `agent_runs`（goal: `"Autonomous System Health & Task Doctor"`）および `agent_steps` に自動永続化すること。
- [ ] **HTTP Trigger エンドポイント (`src/app/api/agent/sweep/route.ts`):**
  - `POST /api/agent/sweep` で `runHealthSweep` を実行し、結果を JSON で返すこと（`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`）。
- [ ] **UIの統合 (`src/components/dashboard/SystemHealthCard.tsx` 等):**
  - ダッシュボード（`/`）または `/agent` に「System Health & Agent Diagnosis」カード（またはバッジ）を表示すること。
  - 最新の診断ステータス（例: 🟢 Healthy / 🟡 Warning: 期限切れタスクが1件あります）、最終スキャン日時、および「Run Health Check（即時巡回）」ボタンを配置すること。
- [ ] **単体テストと品質ゲート:**
  - `src/services/__tests__/sweeperService.test.ts` が追加され、期限切れタスク検知、正常時・異常時の診断判定、トレース永続化の単体テストがすべてパスすること。
  - `npm run verify`（ESLint + TypeCheck + Vitest）がすべてエラーゼロで Green であること。

## 3. 技術設計 (Technical Design)
### 3.1 診断データ型定義 (`src/types/portal.ts` への追加)
```typescript
export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface SweepReport {
  status: HealthStatus;
  summary: string;
  overdueTasksCount: number;
  highPriorityPendingCount: number;
  totalPendingCount: number;
  recommendations: string[];
  sweptAt: string;
}

# Spec 014: Agent Observability Explorer と自律シナリオシミュレーターの実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. `/agent` 画面に、Phase 3 で構築したすべてのエージェント実行履歴（`agent_runs`, `agent_steps`）を集約・分析する「Agent Observability Explorer」を構築し、総実行数・成功率・ロール別ステップ数の統計メトリクスとフィルタリング機能を提供するため。
  2. 面接デモや開発検証をワンクリックで行える「Autonomous Scenario Simulator」を用意し、デモ用タスクの注入と自律巡回・是正ループを即座に再現できるようにするため。
- **参照すべきADR・スキル:**
  - `docs/adr/0012-agent-observability-explorer-and-scenario-runner.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [x] **エージェント実行メトリクスの集計 (`agentMetricsService.ts`):**
  - DBから以下の集約メトリクスを算出できること：
    - 総実行回数（Total Runs）
    - 成功率（Success Rate: %）
    - 実行ロール別ステップ数（Researcher, Planner, Critic, Orchestrator）
    - 直近の実行アクティビティ推移
  - DI（`db` 注入）に対応し、単体テストで正確な集計が検証されていること。
- [x] **Agent Observability Explorer UI (`/agent` 画面):**
  - `/agent` 画面に「Agent Observability & Traces」セクションを追加すること。
  - 上部にKPI統計カード（Total Runs, Success Rate, Active Subagents）を表示すること。
  - 下部に実行ログ一覧（フィルター機能: All / Completed / Failed）および各ステップの詳細アコーディオンを展開表示できること。
- [x] **Autonomous Scenario Simulator (`scenarioService.ts` & UI):**
  - 以下のデモシナリオをワンクリックで実行できる Server Action（`runScenarioAction`）とボタンを提供すること：
    - **Scenario: "System Degradation & Self-Healing Demo"**:
      1. わざと期限切れタスクおよび高優先度滞留タスクをサンプルとしてDBに注入。
      2. 自動で `runHealthSweep` を実行してステータスを Warning/Critical に更新。
      3. 是正プラン（Remediation Plan）を即座に起草した状態にし、ダッシュボードですぐに HITL 是正を体験できるようにセットアップ。
  - 実行後にトーストまたは完了メッセージが表示され、画面が revalidate されること。
- [x] **単体テストと品質ゲート:**
  - `src/services/__tests__/agentMetricsService.test.ts` およびシナリオ生成のテストを追加すること。
  - `npm run verify`（ESLint + TypeCheck + Vitest）がすべてエラーゼロでパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 データ型定義 (`src/types/portal.ts` への追加)
```typescript
export interface AgentSystemMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  successRate: number; // 0 - 100 (%)
  roleBreakdown: {
    researcher: number;
    planner: number;
    critic: number;
    orchestrator: number;
  };
}

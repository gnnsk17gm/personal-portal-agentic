# Phase 3 / Day 5: Agent Observability Explorer と自律シナリオシミュレーターの実装（Spec 014 & ADR 0012）

Phase 3（Day 1 〜 Day 4）を通じて、ポータルには以下の自律エージェント機能が揃いました：

1. **目標自動分解エージェント（Spec 010）:** 抽象ゴールから具象タスク群を生成  
2. **階層型マルチエージェント協調（Spec 011）:** Researcher / Planner / Critic による合議・自己修復  
3. **自律監視 Task Doctor（Spec 012）:** 期限切れ・滞留タスクの能動的パトロール  
4. **自己修復 & HITL 承認（Spec 013）:** 安全な是正プラン起草と人間によるワンクリック承認

Phase 3 の最終日となる本日は、これらすべてのエージェントの活動を一元監視する **「Agent Observability Explorer（エージェント実行メトリクス & 監査コンソール）」** を `/agent` 画面に統合し、さらに技術面接でワンクリックで一連の自律挙動を実演できる **「Scenario Simulation Runner（シナリオシミュレーター）」** を構築して Phase 3 を完璧に締めくくります。

もちろん今回も **完全0円（外部API課金ゼロ）** かつ、100%単体テスト可能な設計です。

---

## 1\. なぜ「Observability Explorer & シミュレーター」が面接で最強の武器になるのか？

AIエージェントの開発現場や技術面接において、面接官が最も見たいのは **「本番運用を想定した可観測性（Observability）と、手軽に動作検証できる仕組み」** です。

1. **Agent Observability Explorer:**

   - 単にログを流すだけでなく、「これまでの総実行回数」「成功率」「エージェントロール別の活動比率」「各ステップの所要傾向」といった **運用メトリクス（Metrics & KPIs）** を可視化します。  
   - 「AIを動かして終わり」ではなく、「AIの稼働品質を継続的にモニタリングできるシステムエンジニア」であることを証明できます。  
2. **Autonomous Scenario Simulator:**

   - 面接時に「まず過去日付タスクを手動で作って、次に診断ボタンを押して…」と操作するのは時間がかかり、説明がもたつきます。  
   - シミュレーターに **「Load Demo Scenario（不健全タスクを注入して自律検知・自己修復させるデモシナリオ）」** を用意しておくことで、ワンクリックで面接官の目の前で鮮やかなエージェント協調ループを実演できます。

---

## 2\. Phase 3 / Day 5 の到達目標（Definition of Done）

- [ ] Day 4 の仕様書（`013`）が `specs/completed/` に移動され、コミット済みであることを確認する  
- [ ] 観測コンソールとシミュレーターの設計根拠を記した `docs/adr/0012-agent-observability-explorer-and-scenario-runner.md` を作成する  
- [ ] 統合仕様書 `specs/active/014-agent-observability-explorer-and-scenario-runner.md` を作成する  
- [ ] Antigravity に Implementation Plan を出力させ、レビュー・承認する  
- [ ] `npm run verify`（全テストGreen）を維持したまま実装を完了させる  
- [ ] `/agent` 画面に「Agent Observability Explorer（実行統計・フィルタ付きトレース一覧）」と「Autonomous Scenario Simulator（ワンクリック実演ボタン）」が稼働することを確認する

---

## 3\. 意思決定の記録：ADR 0012 の作成

### File 1: `docs/adr/0012-agent-observability-explorer-and-scenario-runner.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0012: Agent Observability Explorer（統合観測コンソール）と決定論的シナリオシミュレーターの採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-11
- **決定者:** Project Architect

## 1. コンテキスト (Context)
Phase 3 で複数のエージェントワークフロー（目標分解、Task Doctor巡回、HITL是正適用）が稼働するようになったが、以下の課題がある：
1. **トレース閲覧の分散:** 実行ログが `/tasks` 画面下部に固定されており、システム全体の稼働統計（総実行数、成功率、役割別ステップ数）を俯瞰できない。
2. **デモ・検証の再現性負荷:** 技術面接やテスト時に、エージェントの自律ループ（不健全タスク検知 → 是正提案 → 承認）を再現するために人手で複数の前提データを作成する必要がある。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: 外部の LLM Observability SaaS (LangSmith, Helicone 等) の導入**
  - 高度な分析が可能だが、アカウント登録・APIキー設定が必要で、オフライン環境やローカルでの手軽な確認を損なう。
- **Option 2: `/agent` 画面への内製 Observability Explorer とワンクリック・シナリオシミュレーターの統合**
  - 既存の `agent_runs` / `agent_steps` テーブルから統計メトリクスを即座に集約表示し、検証用シナリオのロード＆自律実行ボタンを内製する。

## 3. 決定内容 (Decision)
**Option 2（内製 Observability Explorer + シナリオシミュレーター）を採用する。**

### 選定理由:
1. **完全無料・依存ゼロのローカル完結:**
   - 外部SaaSを一切介さず、SQLiteの集計クエリだけで高速にメトリクス（成功率、総Run数、ロール別内訳）を描画できる。
2. **圧倒的なデモンストレーション力:**
   - 「Run Demo Incident Scenario」を押すだけで、デモ用の不健全データ注入から自律検知・自己修復提案までが一瞬でセットアップされ、面接官にエージェントの価値を即座に体感させられる。
3. **プロトコルとコンテキストの統合:**
   - `/agent` 画面に「Rules/Skills/Hooks」「MCP Tools Registry」「Observability Explorer」のすべてが集約され、真の「AI統括コントロールセンター」として完成する。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - エージェントの稼働状況を定量的（KPI）かつ定性的（ステップログ）に完全監査できる。
  - テストおよびデモの準備時間がゼロになる。
- **トレードオフ (Negative):**
  - `/agent` 画面の情報量が増えるため、タブやセクションによるクリーンなレイアウト整理が必要。
```

&nbsp;

---

## 4\. 観測コンソール & シミュレーターの仕様書（Spec 014）

### File 2: `specs/active/014-agent-observability-explorer-and-scenario-runner.md`

以下の内容でファイルを作成してください。

```markdown
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
- [ ] **エージェント実行メトリクスの集計 (`agentMetricsService.ts`):**
  - DBから以下の集約メトリクスを算出できること：
    - 総実行回数（Total Runs）
    - 成功率（Success Rate: %）
    - 実行ロール別ステップ数（Researcher, Planner, Critic, Orchestrator）
    - 直近の実行アクティビティ推移
  - DI（`db` 注入）に対応し、単体テストで正確な集計が検証されていること。
- [ ] **Agent Observability Explorer UI (`/agent` 画面):**
  - `/agent` 画面に「Agent Observability & Traces」セクションを追加すること。
  - 上部にKPI統計カード（Total Runs, Success Rate, Active Subagents）を表示すること。
  - 下部に実行ログ一覧（フィルター機能: All / Completed / Failed）および各ステップの詳細アコーディオンを展開表示できること。
- [ ] **Autonomous Scenario Simulator (`scenarioService.ts` & UI):**
  - 以下のデモシナリオをワンクリックで実行できる Server Action（`runScenarioAction`）とボタンを提供すること：
    - **Scenario: "System Degradation & Self-Healing Demo"**:
      1. わざと期限切れタスクおよび高優先度滞留タスクをサンプルとしてDBに注入。
      2. 自動で `runHealthSweep` を実行してステータスを Warning/Critical に更新。
      3. 是正プラン（Remediation Plan）を即座に起草した状態にし、ダッシュボードですぐに HITL 是正を体験できるようにセットアップ。
  - 実行後にトーストまたは完了メッセージが表示され、画面が revalidate されること。
- [ ] **単体テストと品質ゲート:**
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
```

&nbsp;

### 3.2 作成・変更予定ファイル

- `src/types/portal.ts` (変更: `AgentSystemMetrics` 型追加)  
- `src/services/agentMetricsService.ts` (新規: メトリクス集計サービス)  
- `src/services/scenarioService.ts` (新規: デモシナリオ注入・実行サービス)  
- `src/services/__tests__/agentMetricsService.test.ts` (新規: 単体テスト)  
- `src/app/actions.ts` (変更: `runDemoScenarioAction` の追加)  
- `src/components/agent/AgentMetricsCards.tsx` (新規: 統計メトリクス表示カード)  
- `src/components/agent/AgentObservabilityExplorer.tsx` (新規: フィルター付きトレース探査UI)  
- `src/components/agent/ScenarioSimulatorCard.tsx` (新規: ワンクリック・デモ実行カード)  
- `src/app/agent/page.tsx` (変更: 新コンポーネントの配置)

## 4\. 検証手順 (Verification Steps)

1. `npm run verify` がエラーゼロですべてパスすること。  
2. ブラウザで `/agent` を開き、KPIメトリクスカード（総実行数、成功率等）が正しく計算されていることを確認。  
3. 「Run Demo Incident Scenario」をクリックすると、デモタスクが注入され即座に診断が実行されることを確認。  
4. ダッシュボード（`/`）を開くと Warning 状態と是正提案が出現し、「Apply Remediation」で一瞬で修復されることを確認。

````

---

## 5. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0012-agent-observability-explorer-and-scenario-runner.md` と `specs/active/014-agent-observability-explorer-and-scenario-runner.md`）を作成・保存したら、Antigravity に以下の指示プロンプトを送信してください。

※推奨モデル: **`Gemini 4 Argon (Medium)`** または **`Claude Sonnet 5.5`**

### 💬 エージェントへの指示プロンプト（コピペ用）

```text
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0012-agent-observability-explorer-and-scenario-runner.md の設計判断を踏まえた上で、
@specs/active/014-agent-observability-explorer-and-scenario-runner.md の仕様を実装してください。

外部API課金は一切行わず、決定論的なローカルエンジンで完結させてください。
まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
````

&nbsp;
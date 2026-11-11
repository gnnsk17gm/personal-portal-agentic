# Phase 3 / Day 3: 自律監視バックグラウンドエージェント（Autonomous Sweeper & Task Doctor）の実装（Spec 012 & ADR 0010）

Day 1〜2 では、ユーザーが入力した目標から専門サブエージェント（Researcher / Planner / Critic）が合議してタスクを自動分解する仕組みを作りました。

しかし、真の自律型エージェント（Autonomous Agent）とは **「人間が指示を出さなくても、裏で勝手に仕事やタスクの滞留を点検し、トラブルを未然に防ぐエージェント」** です。

Phase 3 Day 3 では、ポータル内の状態を定期的に巡回（Sweep）し、

1. **期限超過（Overdue）や放置タスクの検知・警告診断**  
2. **直近メモの未処理分析（Second Brainの整理状況チェック）**  
3. **朝のブリーフィング（Context Assembler）の自動更新 & 是正提案アクション** を自律遂行する **「Autonomous Task Doctor（自律巡回ドクター）」** を構築します。

今回も **完全0円（外部API課金ゼロ）** かつ、手動実行ボタンおよび自動トリガー（Cron / Webhook エンドポイント）の両方に対応した高信頼アーキテクチャとします。

---

## 1\. なぜ「自律巡回エージェント（Sweeper）」が転職で強いのか？

AIエージェントの現場で高く評価されるのは、「言われたことだけをやる受動型（Reactive）AI」ではなく、**「自ら状態を監視して先回りでアクションを起こす能動型（Proactive）エージェント」** を作れるエンジニアです。

| 開発アプローチ | 受動型（一般的なポートフォリオ） | 能動型・自律巡回（本プロジェクト） |
| :---- | :---- | :---- |
| **起動契機** | ユーザーが毎回ボタンを押した時だけ | 定期トリガー（Cron/API）＋ 手動ワンクリック |
| **役割** | 要求されたタスクをその場で作る | **放置タスクや期限切れを自動スキャンして是正提案** |
| **信頼性** | 失敗してもユーザーが気づくまで放置 | 巡回結果を `agent_runs` に記録し、ダッシュボードに診断バッジ表示 |

面接官に **「受動的なチャットボットにとどまらず、システムの不健全な状態を自律的に検知・自己修復提案する Proactive Agent パイプラインを設計できる」** ことを実証できます。

---

## 2\. Phase 3 / Day 3 の到達目標（Definition of Done）

- [ ] 自律監視アーキテクチャを記した `docs/adr/0010-autonomous-sweeper-and-scheduled-agent.md` を作成する  
- [ ] 自律巡回エージェントの仕様書 `specs/active/012-autonomous-task-doctor.md` を作成する  
- [ ] Antigravity に Implementation Plan を出力させ、レビュー・承認する  
- [ ] `npm run verify`（全テストGreen）を維持したまま、巡回・診断ロジックを実装する  
- [ ] ダッシュボード（`/`）に「System Health & Agent Diagnosis（エージェント診断結果）」バッジが表示され、ワンクリックまたは `/api/agent/sweep` で自律巡回が実行できることを確認する

---

## 3\. 意思決定の記録：ADR 0010 の作成

### File 1: `docs/adr/0010-autonomous-sweeper-and-scheduled-agent.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0010: プロアクティブ自律監視エージェント（Autonomous Sweeper）とWebhook/Cronトリガーの採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-09
- **決定者:** Project Architect

## 1. コンテキスト (Context)
これまでのエージェント機能はユーザーがフォームから「目標分解」を送信した時のみ動作する受動型（Reactive）であった。
しかしパーソナルポータルの実運用では、「期日を過ぎた放置タスクの山積み」「未整理のまま滞留しているQuick Captureメモ」などをユーザー自身が気付いて解消する負荷が高い。
システムが自律的にデータベースを巡回（Sweep）し、タスクの健康度を診断して是正提案を出すプロアクティブ（Proactive）な自律機構が求められる。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: Node.jsプロセス内に `setInterval` で常駐タイマーを持たせる**
  - Next.js のサーバーレス/コンテナ環境（Vercel, Cloud Run等）において、プロセスの再起動やスリープによってタイマーが消失しやすく不安定。
- **Option 2: 独立した Sweeper サービス + HTTP Trigger (`POST /api/agent/sweep`) + UI手動トリガーの併用**
  - 巡回診断ロジックを純粋なサービス（`sweeperService`）として切り出し、外部のCronジョブ（GitHub Actions, Vercel Cron, システムcron）や手動UIから同一のAPI/Actionを安全に叩けるようにする。

## 3. 決定内容 (Decision)
**Option 2（Sweeper Service + HTTP Route Handler + UI手動トリガー）を採用する。**

### 選定理由:
1. **プラットフォーム非依存性（Serverless-friendly）:**
   - 常駐タイマーに依存せず、HTTPリクエスト1発で巡回を実行・完了できるため、ローカル開発・本番環境（Docker/Vercel/Cloud Run）のいずれでも堅牢に動作する。
2. **Agent Observability の統一:**
   - 巡回診断の実行結果も Day 1〜2 と同じ `agent_runs` および `agent_steps` テーブルに `goal: "System Health & Task Sweeper"` として記録し、思考・判定ログを同一のUIで監査可能にする。
3. **完全無料・決定論的テストの継続:**
   - 外部LLMに課金せず、日付比較・滞留件数分析・優先度バランス判定を決定論的ルールで行うことで、Vitestによる100%の単体テストを担保する。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - 放置タスクの早期発見とポータルの健全性が自動で維持される。
  - 面接で「受動的AIと能動的自律エージェントのアーキテクチャ差分」を明確に語れる。
- **トレードオフ (Negative):**
  - 定期巡回用エンドポイント（`/api/agent/sweep`）の保守が必要となる。
```

&nbsp;

---

## 4\. 自律巡回エージェントの仕様書（Spec 012）の作成

### File 2: `specs/active/012-autonomous-task-doctor.md`

以下の内容でファイルを作成してください。

```markdown
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
```

&nbsp;

### 3.2 作成・変更予定ファイル

- `src/types/portal.ts` (変更: `HealthStatus`, `SweepReport` 型定義の追加)  
- `src/services/sweeperService.ts` (新規: 自律巡回・診断・トレース記録ロジック)  
- `src/services/__tests__/sweeperService.test.ts` (新規: 単体テスト)  
- `src/app/api/agent/sweep/route.ts` (新規: Cron/外部連携用 HTTP エンドポイント)  
- `src/app/actions.ts` (変更: `runHealthSweepAction` の追加と `/` の revalidate)  
- `src/components/dashboard/SystemHealthCard.tsx` (新規: 診断ステータスカード)  
- `src/app/page.tsx` (変更: ダッシュボード内に `SystemHealthCard` を組み込み)

## 4\. 検証手順 (Verification Steps)

1. `npm run verify` がすべてエラーゼロでパスすること。  
2. 期限が過去の日付のタスクを作成した状態で「Run Health Check」を実行し、ステータスが `warning` に変化して期限切れのアラートが表示されることを確認。  
3. `curl -X POST http://localhost:3000/api/agent/sweep` を実行し、JSON 診断結果が返却され、`agent_runs` タイムラインに新しい Run が刻まれることを確認。

````

---

## 5. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0010-autonomous-sweeper-and-scheduled-agent.md` と `specs/active/012-autonomous-task-doctor.md`）を作成・保存したら、Antigravity に以下の指示プロンプトを送信してください。

※推奨モデル: **`Gemini 4 Argon (Medium)`** または **`Claude Sonnet 5.5`**

### 💬 エージェントへの指示プロンプト（コピペ用）

```text
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0010-autonomous-sweeper-and-scheduled-agent.md の設計判断を踏まえた上で、
@specs/active/012-autonomous-task-doctor.md の仕様を実装してください。

外部API課金は一切行わず、決定論的なローカルエンジンで完結させてください。
まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
````

&nbsp;
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

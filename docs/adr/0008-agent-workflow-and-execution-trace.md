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

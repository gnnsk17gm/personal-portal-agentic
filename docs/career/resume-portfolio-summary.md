# 職務経歴書・ポートフォリオ提出用サマリー

**Personal Portal — Autonomous Agentic Platform**

> リポジトリ: https://github.com/gnnsk17gm/personal-portal-agentic
> 本書の数値・設計判断は、すべてリポジトリ内の実装（`src/`）・仕様書（`specs/completed/`）・ADR（`docs/adr/`）・CI 定義（`.github/workflows/ci.yml`）に基づいています。

---

## 0. プロジェクト基本情報

| 項目 | 内容 |
| --- | --- |
| **プロジェクト名** | Personal Portal — Autonomous Agentic Platform |
| **開発形態** | 個人開発（AI コーディングエージェント Google Antigravity との協働） |
| **担当範囲** | アーキテクチャ設計、仕様策定（Spec 15 件）、意思決定記録（ADR 13 件）、AI エージェント統治ルールの設計、実装レビュー、テスト設計、CI 構築 |
| **期間** | 2026 年 11 月（約 2 週間：Spec 001 → Spec 015） |
| **規模** | 機能仕様 15 件 / ADR 13 件 / Vitest 14 スイート・123 テスト / サービス層 12 モジュール |
| **主要技術** | Next.js 16（App Router / Server Actions）, React 19, TypeScript（Strict）, Drizzle ORM + SQLite, Vitest, GitHub Actions, MCP（JSON-RPC 2.0） |

---

## 1. プロジェクト概要（3 行サマリー）

1. **LLM API を呼ぶだけの「AI チャット／ラッパーアプリ」ではなく**、仕様駆動開発（SDD）・コンテキストエンジニアリング・マルチエージェント協調という「AI と協働してソフトウェアを作る方法論」そのものを設計・実証したプロジェクトです。
2. アプリ内には **Researcher / Planner / Critic のマルチエージェント、自律巡回する Task Doctor、人間承認（HITL）付きの自己修復エージェント**、そして外部 AI クライアントと接続する **MCP サーバー**を実装し、全実行をトレースとして永続化・可観測化しました。
3. **外部 LLM API 課金ゼロ・API キー不要**で `git clone` 直後から全機能が動作し、エージェントの振る舞いを含む全ロジックを**決定論的（同じ入力 → 常に同じ出力）な 123 件の自動テスト**で検証しています。

---

## 2. STAR 法による実績記述（職務経歴書コピペ用）

> [!TIP]
> 職務経歴書の「自己 PR」「個人開発実績」欄にそのまま貼り付けられる粒度で記述しています。文字数制限がある場合は、末尾の「短縮版」を使用してください。

### ■ Situation（背景・課題）

生成 AI を用いたコーディング（AI 駆動開発）では、以下の 3 つの構造的課題が生じやすいと考えていました。

- **ハルシネーション（もっともらしい誤り）:** 仕様が曖昧なまま AI に実装させると、要件にないロジックや存在しない API が混入し、レビュー負荷と手戻りが増大する。
- **属人化・ブラックボックス化:** 「なぜその設計にしたのか」がプロンプト履歴に埋もれ、本人以外が設計意図を追跡できない。AI エージェント側の推論プロセスも人間から見えない。
- **コンテキスト肥大化:** AI に渡す前提知識（ルール・データ・ナレッジ）を無制限に詰め込むと、トークンコストの増大と推論精度の低下（ノイズ混入）を招く。

加えて、外部 LLM API に依存したアプリは **API キーが無い環境（CI・面接官のローカル環境）で動作・テストできず**、ランニングコストも発生するという実務上の問題がありました。

### ■ Task（ミッション）

- 人間の役割を「コードを書く人」から **「仕様・制約・判断基準を設計するアーキテクト」** へ転換し、AI エージェントが仕様から逸脱せずに実装できる開発統治の仕組みを確立すること。
- その上で、**外部 API 課金ゼロ**かつ**決定論的にテスト可能**な、自律エージェント搭載のパーソナルポータル（タスク・ナレッジ・エージェント実行履歴の統合管理）を構築すること。

### ■ Action（技術的工夫・実装内容）

#### 1. `.antigravity/`（Rules / Skills / Hooks）と SDD・ADR による AI 開発統治

- AI エージェントに渡すコンテキストを **3 階層に分離**して設計。
  - **Rules（常時適用の憲法）:** 「承認された仕様書がない限り実装禁止」「実装前に計画を提示し人間の承認を得る」「`any` や型キャストによるエラー握り潰しの禁止」などを明文化。
  - **Skills（再利用可能な手順書）:** 「仕様分析 → 実装計画（人間承認）→ 実装 → 検証」の定型ワークフローを手順書化。
  - **Hooks（機械的な品質ゲート）:** ESLint → `tsc --noEmit` → Vitest を一括実行する `verify-all.sh` で、AI の自己申告ではなく機械判定で完了を担保。
- **全 15 機能を仕様書（Spec）起点で実装**し、受け入れ基準を事前定義。技術選定・設計判断は **13 件の ADR（Architecture Decision Record）** として「検討した選択肢・採用理由・トレードオフ」を記録し、設計意図の属人化を排除。

#### 2. トークン予算制御付き Dynamic Context Assembler と Pure TypeScript 製 BM25 ローカル RAG

- タスク・ナレッジ・予定を統合して LLM 投入可能な Markdown コンテキストを生成する **Context Assembler** を実装。**文字数予算（デフォルト 1,500 文字）** を超える場合はセクション優先度（タスク → 関連ナレッジ → 予定 → ノート）に従って行単位で切り詰め、推定トークン数と `truncated` フラグを UI で監査可能にした。
- 外部データソースは **Provider パターン**（`ScheduleProvider` / `TaskDecompositionProvider`）で抽象化し、API キー無しでも動作するローカル実装を既定値として DI（依存性注入）で差し替え可能に設計。
- ベクトル DB や Embeddings API を使わず、**BM25 アルゴリズム（k1 = 1.2, b = 0.75）を Pure TypeScript で内製**。日本語は形態素解析辞書に依存しない **CJK Bi-gram トークナイザ**で処理。
- 高優先度タスク上位 3 件のタイトルをクエリとして関連ナレッジを自動検索し、コンテキストへ注入する **タスク駆動型ローカル RAG（検索拡張生成）** を実現。

#### 3. MCP（Model Context Protocol / JSON-RPC 2.0）エンドポイントと Stdio ブリッジ

- 外部 SDK に依存せず、Next.js Route Handler 上に **JSON-RPC 2.0 準拠の MCP サーバー（`/api/mcp`）** を内製。`initialize` / `tools/list` / `tools/call` / 通知（Notification）を実装し、`-32600`（Invalid Request）/ `-32602`（Invalid Params）等の標準エラーコードで厳格にバリデーション。
- `get_daily_briefing` / `search_knowledge_notes` / `create_portal_task` の 3 ツールを JSON Schema 付きで公開し、既存サービス層をそのままツールハンドラーとして再利用。
- Node.js 標準の `readline` と `fetch` のみで書いた **ゼロ依存の Stdio ⇔ HTTP ブリッジ**（`scripts/mcp-bridge.mjs`）を同梱し、Claude Desktop などの Stdio 型 MCP クライアントから接続可能にした。ブラウザ上でツールを直接実行できる **MCP Interactive Runner** も内製。

#### 4. Researcher / Planner / Critic のマルチエージェント協調と HITL 自己修復ガードレール

- 目標分解エージェントを **Researcher（BM25 ナレッジ検索）→ Planner（タスク立案）→ Critic（検証・自己修正）→ Orchestrator（トランザクション永続化）** の役割に分割。Critic は「先頭タスクは必ず high」「期日は厳密に時系列昇順」「無効・未設定の期日は補正」というガードレールで Planner の出力を自動修正し、補正内容を監査ログに残す。
- 期限切れ・7 日以上滞留した高優先度タスクを自律診断する **Task Doctor（Sweeper）** を実装し、UI・Server Action・HTTP トリガー（`POST /api/agent/sweep`、Cron / Webhook 想定）の 3 経路から同一ロジックを起動可能にした。
- 是正（期日リスケジュール・優先度調整）は **Human-in-the-loop（HITL）** で設計。AI は副作用のない「是正プラン」のみを生成し、人間が承認した時だけ **DB トランザクション内で一括適用**。適用直前に各タスクの現在値を再読込し、提案時の値と異なれば適用をスキップする **楽観的競合検証（Optimistic Concurrency Check）** で意図しない上書きを防止。
- 全エージェントの実行を `agent_runs` / `agent_steps` テーブルに役割（researcher / planner / critic / orchestrator）付きで永続化し、**Agent Observability Explorer**（総実行数・成功率・ロール別ステップ数・日別実行数）で可視化。不健全データの注入から是正提案までをワンクリックで再現する**冪等なシナリオシミュレーター**も内製。

#### 5. GitHub Actions CI と Vitest（14 スイート・123 テスト）による品質保証

- 現在時刻 `now` と DB を DI 可能にし、テスト時は **インメモリ SQLite（`:memory:`）** へ自動切替することで、本番 DB を汚染しない決定論的な単体テストを 14 スイート・123 件整備。
- GitHub Actions で **ESLint → TypeScript Strict 型検査 → Vitest 全件 → `next build`** を push / PR ごとに自動実行する CI を構築。
- CI 構築時に Linux 環境特有の問題を 3 件解決：
  - クリーン環境で `next typegen` 前に `tsc` が走ることで生じた **`LayoutProps` 未定義の型エラー** を、明示的な型定義へ置換して解消。
  - Vitest のファイル並列実行時に native モジュール **`better-sqlite3` が `SIGSEGV` でクラッシュ**する問題を、`fileParallelism: false` によるワーカー競合の排除で解消（全件実行は約 3 秒のため実行時間への影響は軽微）。
  - `.nvmrc`（Node.js 24）と `node-version-file` で **ローカルと CI の Node.js バージョンを単一ソースに統一**。

### ■ Result（定量的成果）

| 指標 | 成果 |
| --- | --- |
| 🧪 **自動テスト** | **14 スイート / 123 テスト — 100% 通過**（ローカル・CI 双方） |
| 💸 **外部 API ランニングコスト** | **$0 / 月**（LLM・ベクトル DB・Observability SaaS への依存ゼロ） |
| 📘 **仕様駆動開発** | 機能仕様 **15 件すべてを「1 仕様 = 1 機能コミット」で完了**し、仕様起因の手戻り（仕様差し戻し・再設計）ゼロを達成 |
| 🧭 **設計判断の可視化** | ADR **13 件**で全主要技術選定の根拠とトレードオフを記録 |
| ✅ **品質ゲート自動化** | Lint・型検査・テスト・本番ビルドの 4 段ゲートを push ごとに自動実行（README に CI バッジ表示） |
| 🚀 **再現性** | API キー・`.env`・Docker 不要。`npm install && npm run dev` のみで全機能が動作 |

---

### 📋 短縮版（職務経歴書の文字数制限向け・約 300 字）

```text
【個人開発】自律型AIエージェント搭載パーソナルポータル（Next.js 16 / TypeScript / Drizzle ORM / SQLite）
AI駆動開発で生じるハルシネーション・設計意図の属人化・コンテキスト肥大化の課題に対し、仕様駆動開発（Spec 15件）とADR（13件）、AIエージェント統治ルール（Rules/Skills/Hooks）で開発プロセスを設計。アプリ内には文字数予算制御付きContext Assembler、Pure TypeScript製BM25ローカルRAG、MCP（JSON-RPC 2.0）サーバー、Researcher/Planner/Criticのマルチエージェント、人間承認（HITL）付き自己修復エージェントを実装。外部LLM API課金$0で、123件の決定論的テストとGitHub Actions CIにより品質を担保。
```

### 📋 1 行版（ポートフォリオ一覧・SNS プロフィール向け）

```text
仕様駆動開発×コンテキストエンジニアリング×マルチエージェント協調を、外部LLM API課金$0・123テスト全通過で実証した自律型ポータル（Next.js 16 / TypeScript / MCP）
```

---

## 3. 技術スタック & 設計キーワード一覧

### 3.1 技術スタック

| カテゴリ | 採用技術 | 採用理由（ADR） |
| --- | --- | --- |
| **Framework** | Next.js 16（App Router / Server Components / Server Actions）, React 19 | AI の出力精度と Server/Client 責務分離（[ADR 0001](../adr/0001-initial-tech-stack.md)） |
| **Language** | TypeScript（Strict Mode） | AI 生成コードの誤りを型検査で即時検知 |
| **Styling** | Tailwind CSS v4, lucide-react | スタイル破綻の抑制と高速な UI 構築 |
| **Database / ORM** | SQLite（better-sqlite3, WAL モード）+ Drizzle ORM / drizzle-kit | Pure TypeScript スキーマで型推論が即時に効く（[ADR 0002](../adr/0002-database-and-orm-selection.md)） |
| **Search / RAG** | 内製 BM25（k1 = 1.2, b = 0.75）+ CJK Bi-gram トークナイザ | 外部課金ゼロ・決定論的テスト可能（[ADR 0004](../adr/0004-local-retrieval-and-bm25.md)・[0005](../adr/0005-task-driven-local-rag.md)） |
| **Agent Protocol** | Model Context Protocol（HTTP JSON-RPC 2.0 + Stdio Bridge） | エージェント業界標準への準拠（[ADR 0006](../adr/0006-model-context-protocol-server.md)・[0007](../adr/0007-mcp-interactive-runner-and-stdio-bridge.md)） |
| **Testing / Quality** | Vitest, ESLint, `tsc --noEmit`, インメモリ SQLite | DI による決定論的テスト |
| **CI** | GitHub Actions（ubuntu-latest / Node.js 24 / npm キャッシュ） | Linux 本番相当環境でのビルド保証（[ADR 0013](../adr/0013-github-actions-ci-and-production-build.md)） |
| **AI 開発環境** | Google Antigravity（Rules / Skills / Hooks） | コンテキストエンジニアリングによる AI 統治 |

### 3.2 設計キーワード（スカウト・検索対策用）

| 領域 | キーワード |
| --- | --- |
| **AI 駆動開発プロセス** | 仕様駆動開発（SDD: Spec-Driven Development）／コンテキストエンジニアリング／ADR（Architecture Decision Record）／AI エージェント統治（Agent Governance）／品質ゲート（Quality Gate）／Human-in-the-loop |
| **エージェント設計** | マルチエージェント協調（Multi-Agent Orchestration）／Plan-and-Execute／Self-Correction（自己修正）／Guardrails／Critic / Verifier パターン／自律巡回エージェント（Proactive Agent）／Self-Healing |
| **コンテキスト / RAG** | Dynamic Context Assembly／Token Budget 制御／RAG（Retrieval-Augmented Generation）／BM25／Sparse Retrieval／Just-in-Time Context |
| **プロトコル / 連携** | Model Context Protocol（MCP）／JSON-RPC 2.0／Stdio Transport／Tool Calling（JSON Schema） |
| **信頼性 / 安全性** | 楽観的競合検証（Optimistic Concurrency Control）／アトミックトランザクション／冪等性（Idempotency）／監査ログ（Audit Trail）／Agent Observability |
| **アーキテクチャ** | Provider パターン（Strategy）／依存性注入（DI）／レイヤードアーキテクチャ（UI / Context / Agent / Protocol / Persistence）／ローカルファースト／Zero-Cost Architecture |
| **テスト / CI** | 決定論的テスト（Deterministic Testing）／インメモリ DB テスト／GitHub Actions／本番ビルド検証／Linux 環境トラブルシューティング |

---

## 4. 読み手別アピールポイント

### 👔 採用担当者（書類選考）向け

- **「AI を使える」ではなく「AI に正しく仕事をさせる仕組みを作れる」** ことを、15 件の仕様書と 13 件の ADR という**成果物で証明**しています。
- CI バッジ・テスト件数・コスト $0 など、**第三者が数秒で検証できる定量指標**を README に掲示しています。

### 🧑‍💼 エンジニアリングマネージャー（EM 面談）向け

- **意思決定の言語化:** 全 ADR に「却下した選択肢とトレードオフ」を明記しており、技術選定の説明責任を果たせます（例: Prisma ではなく Drizzle、外部 Observability SaaS ではなく内製）。
- **AI 活用のリスク管理:** 「AI にデータを書き換えさせる」場面で、HITL・トランザクション・楽観的競合検証・監査ログという**多層防御**を設計しています。チームへ AI エージェントを導入する際のガバナンス設計にそのまま転用できる知見です。
- **チーム開発への展開性:** Rules / Skills / Hooks の 3 階層は、属人的なプロンプト技術を**チーム共有可能な資産**へ変換する仕組みです。新メンバーや別の AI エージェントでも同じ品質基準で開発できます。
- **トラブルシューティング力:** 「ローカルでは通るが CI（Linux）で落ちる」問題を、再現 → 原因切り分け → 最小変更で解決し、コミット単位で記録しています。


# Phase 4 / Day 3: 職務経歴書（STAR法）& 技術面接想定問答集の構築

Day 2 までに、GitHub リポジトリの外観（CI緑バッジ、アーキテクチャ図、定量メトリクス）が完璧に整いました。 Day 3 では、このリポジトリを武器にして**書類選考を突破し、技術面接で面接官を唸らせるための「キャリア・面接対策ドキュメント群（`docs/career/`）」** をプロジェクト内に構築します。

Antigravity にリポジトリ内の全コード・全Spec・全ADRを読み込ませることで、単なる一般論ではなく\*\*「あなたの実際のコード・テスト件数・設計判断に100%裏打ちされたリアルな職務経歴書と想定問答集」\*\*を生成させます。

---

## 1\. Day 3 の到達目標（Definition of Done）

- [ ] Day 2 の `README.md` 更新が `git push` され、GitHub トップページに緑バッジとアーキテクチャ図が表示されていること  
- [ ] `docs/career/resume-portfolio-summary.md`（職務経歴書・ポートフォリオ提出用サマリー）が作成されていること  
- [ ] `docs/career/technical-interview-qa.md`（技術面接・深掘り質問への回答案＆3分間デモ台本）が作成されていること  
- [ ] `README.md` にキャリアドキュメントへのリンク（またはプロジェクト総括セクション）が整理され、GitHub にプッシュされていること

---

## 2\. なぜプロジェクト内に「面接対策ドキュメント」を置くのか？

1. **実コードとの完全な整合性:** Antigravity に `src/` や `docs/adr/` を直接参照させて執筆させることで、「BM25の数式パラメータ（${k}_{1}=1.2,b=0.75$）」「Critic サブエージェントの日付逆転補正ロジック」「CI での `isolate: false` による `SIGSEGV` 解消経験」など、**実際に手を動かした人にしか語れない生々しい技術エピソード**を言語化できます。  
2. **面接直前の最強のカンニングペーパー:** オンライン面接の直前に `docs/career/technical-interview-qa.md` を開くだけで、3分間デモの手順から、意地悪な技術質問（「なぜ外部LLMを使わなかったのか？」「本番スケール時はどうするのか？」）への模範解答まで一瞬で頭に入ります。

---

## 3\. Antigravity への指示プロンプト（Day 3 実行用）

以下のプロンプトをそのままコピーして、Antigravity のチャット欄に送信してください。

```
これまで構築してきた本リポジトリの全資産（`src/` 配下の実装、`specs/completed/001〜015`、`docs/adr/0001〜0013`、`.github/workflows/ci.yml`）を分析し、転職活動（書類選考および技術面接・EM面談）でそのまま活用できる以下の2つのキャリア資産ドキュメントを `docs/career/` 配下に作成してください。

※アプリケーションのソースコード（`src/`）は変更しないでください。

### 1. `docs/career/resume-portfolio-summary.md`（職務経歴書・ポートフォリオ提出用）
以下の構成で、採用担当者およびエンジニアリングマネージャーに響く表現で執筆してください：
- **プロジェクト概要（3行サマリー）:** 単なるAIチャットアプリではなく、仕様駆動開発（SDD）・コンテキストエンジニアリング・マルチエージェント協調を実証したシステムであること。
- **STAR法による実績記述（職務経歴書コピペ用フォーマット）:**
  - **Situation（背景・課題）:** AI駆動開発におけるハルシネーションや属人化、コンテキスト肥大化の課題。
  - **Task（ミッション）:** 人間の役割をアーキテクトへ転換し、外部API課金ゼロ・決定論的テスト可能な自律型ポータルを構築すること。
  - **Action（技術的工夫・実装内容）:**
    1. `.antigravity/`（Rules / Skills / Hooks）と SDD（15仕様書）・ADR（13判断ログ）による開発統治
    2. トークン予算制御付き Dynamic Context Assembler と Pure TypeScript 製 BM25 ローカルRAGの実装
    3. MCP（Model Context Protocol / JSON-RPC 2.0）エンドポイントおよび Stdio ブリッジの構築
    4. Researcher / Planner / Critic のマルチエージェント協調と、Human-in-the-loop (HITL) 自己修復ガードレール
    5. GitHub Actions CI と Vitest（14スイート・123テスト）による品質保証（Linux環境での native sqlite ワーカー競合解決含む）
  - **Result（定量的成果）:** 123テスト100%通過、外部APIランニングコスト$0、仕様駆動による手戻りゼロ開発の達成。
- **技術スタック & 設計キーワード一覧**

### 2. `docs/career/technical-interview-qa.md`（技術面接・深掘り想定問答集 & デモ台本）
面接官から飛んでくる鋭い技術質問に対する「結論ファーストの模範回答」を10問以上作成してください。必ず以下の質問を含めてください：
- Q1: 「なぜ OpenAI や Gemini などの外部 LLM API を直接叩かず、ルールベース＋BM25のローカルエンジンにしたのですか？（課金ゼロの意図）」
- Q2: 「もし本番運用で本物の LLM（Gemini / Claude / Ollama）に頭脳を差し替える場合、コードのどこをどう変更しますか？（Providerパターンの説明）」
- Q3: 「マルチエージェント構成（Researcher / Planner / Critic）において、Critic にはどのようなガードレールを持たせていますか？」
- Q4: 「AIにタスクの期日を自動修正させる際、暴走や意図しないデータ破壊をどうやって防いでいますか？（HITLと楽観的競合検証の説明）」
- Q5: 「なぜ ORM に Prisma ではなく Drizzle ORM + SQLite を選んだのですか？（AI駆動開発の観点からの理由）」
- Q6: 「GitHub Actions の CI 構築時に苦労した点や、Linux 環境特有のトラブルシューティング経験はありますか？（`LayoutProps` 型エラーや `better-sqlite3` の `SIGSEGV` 解決のリアルな話）」
- Q7: 「このアプリがスケールしてデータ量が10万件になった場合、現在のアーキテクチャのどこがボトルネックになり、どう改善しますか？」
- **付録: 面接官を3分で魅了する「ライブデモ実演台本（セリフ付き）」**（`/agent` の Scenario Simulator → `/` の HITL 修復 → `/agent` の Observability 確認の流れ）

作成後、内容のサマリーを報告してください。
```

---

## 4\. 完了後の確認 & Git コミット手順

Antigravity が 2 つのドキュメントを作成したら、中身に目を通し（特に「自分の言葉として面接で話しやすそうか」をチェック！）、以下のコマンドでリポジトリに保存・公開します：

```sh
git add docs/career/
git commit -m "docs(career): add STAR-format resume summary and technical interview Q&A guide"
git push origin main
```

---

## 5\. 次のステップ（Day 4・Day 5 の予告）

Day 3 が完了すれば、いよいよ残り2日です！

- **Day 4:** Zenn / Qiita 向けの技術発信記事の執筆（エンジニアコミュニティからのスカウト・評価獲得）  
- **Day 5:** 本番環境へのデプロイ（Docker / Vercel 等）＆ Phase 4 全体の総仕上げ

まずは Day 3 のプロンプトを Antigravity に送信して、あなたの武器となる面接対策ドキュメントを生成しましょう！
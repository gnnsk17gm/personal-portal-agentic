# Phase 4 / Day 4: Zenn / Qiita 技術発信記事の執筆 & 公開準備

Day 3 までに、職務経歴書（STAR法）と技術面接の想定問答集が完成し、選考を突破する「守りと対話の武器」が揃いました。 Day 4 では、さらに一歩踏み込んで **「技術ブログ（Zenn / Qiita）としてそのまま公開できるレベルの本格技術解説記事」** をプロジェクト内に執筆・ストックします。

Antigravity にリポジトリ内の実コード（BM25、Context Assembler、マルチエージェント、CI設定）を直接引用させながら記事を構成させることで、コピペしてそのまま Zenn や Qiita に公開できる高品質な原稿を一気に仕上げます。

---

## 1\. Day 4 の到達目標（Definition of Done）

- [ ] Day 3 の `docs/career/` ドキュメントが `git push` されていること  
- [ ] Zenn / Qiita 公開用の技術記事原稿 `docs/articles/zenn-agentic-portal-architecture.md` が作成されていること  
- [ ] 記事内に **システム全体図（Mermaid）**、**実際のサービス層コードの抜粋**、**リアルなトラブルシューティング実体験（CIでの `SIGSEGV` 解消など）** が盛り込まれていること  
- [ ] `README.md` に技術記事へのリンクセクション（または執筆完了の記載）を追加し、GitHub にプッシュされていること

---

## 2\. なぜ「技術記事の発信」が転職で圧倒的な武器になるのか？

採用担当者や現場のテックリードが技術記事を見るポイントは、単なる「技術力」だけではありません。

1. **「言語化能力・ドキュメンテーション力」の証明:** チーム開発において、自分の設計意図を他者に分かりやすく伝える力はコーディング力と同等に評価されます。記事が1本あるだけで「ドキュメントが書けるエンジニア」と即座に判断されます。  
2. **「ハマりどころと解決プロセス」のリアルさ:** 単なるチュートリアル記事ではなく、「Linux CI環境で `better-sqlite3` が `SIGSEGV` を起こし、`isolate: false` で解決した話」や「Criticエージェントに期日逆転のガードレールを持たせた理由」など、**実際に作り切った人にしか書けない一次情報** はエンジニアから強い共感と「いいね（LGTM）」を集めます。  
3. **職務経歴書・GitHubからの導線強化:** 職務経歴書のポートフォリオ欄に「GitHubリポジトリ」と並べて「技術解説記事（Zenn/Qiita）」のURLを貼ることで、書類選考の通過率が劇的に向上します。

---

## 3\. Antigravity への指示プロンプト（Day 4 実行用）

以下のプロンプトをそのままコピーして、Antigravity のチャット欄に送信してください。

```
本リポジトリの実装コード（`src/services/` 配下の各種サービス）、仕様書（`specs/completed/001〜015`）、意思決定ログ（`docs/adr/0001〜0013`）、および CI 設定（`.github/workflows/ci.yml`, `vitest.config.ts`）を参照し、Zenn や Qiita にそのまま公開できる技術解説記事を `docs/articles/zenn-agentic-portal-architecture.md` として執筆してください。

※アプリケーションのソースコード（`src/`）は変更しないでください。

### 記事の要件・構成
- **想定読者:** AI駆動開発、エージェントアーキテクチャ、Next.js / TypeScript の実践的な設計に関心のあるWebエンジニア・テックリード。
- **記事タイトル案:** 冒頭に読者の興味を引くタイトル案を3パターン提示してください（例：「外部LLM課金ゼロで挑む『仕様駆動開発（SDD）× マルチエージェント』自律型パーソナルポータルの設計と実装」など）。
- **本文構成:**
  1. **はじめに（課題意識とゴール）:** なぜ単なるAIチャットではなく「SDD（15仕様書）＋ ADR（13判断ログ）＋ 外部API課金0円」のポータルを作ったのか。
  2. **全体アーキテクチャ（Mermaid図）:** UI層・Context層・Multi-Agent層・MCPプロトコル層・DB層の全体像。
  3. **コンテキストエンジニアリングの実践（実コード引用）:**
     - トークン予算制御付き `Dynamic Context Assembler` の仕組み
     - Pure TypeScript 製 BM25 ローカルRAG（`searchService.ts`）の数式と実装ポイント
  4. **マルチエージェント協調と安全性（Guardrails & HITL）:**
     - `Researcher` / `Planner` / `Critic` の役割分離と、`Critic` による期日逆転の自己修復ロジック
     - 自律巡回（Task Doctor）から人間承認（Human-in-the-loop）までの安全設計
  5. **業界標準プロトコル MCP（Model Context Protocol）の自作:**
     - HTTP JSON-RPC 2.0 エンドポイントと、ゼロ依存 Stdio ブリッジ（`scripts/mcp-bridge.mjs`）の設計
  6. **開発中のリアルなハマりどころと解決策（実体験エピソード）:**
     - `.antigravity/`（Rules / Skills / Hooks）でAIの暴走をどう防いだか
     - GitHub Actions（Ubuntu）で `better-sqlite3` が `SIGSEGV` クラッシュを起こした原因と、`vitest.config.ts`（`isolate: false`）での解決ログ
  7. **おわりに（定量的成果と今後の展望）:** 123テスト全通過の品質基盤と、本番LLM差し替えに向けた拡張性。

- **トーン＆マナー:** 技術ブログとして読みやすく、見出し・箇条書き・実際のTypeScriptコードブロック・図解をバランスよく配置した「です・ます」調で執筆してください。

執筆完了後、記事の構成サマリーを報告してください。
```

---

## 4\. 完了後の確認 & 公開・コミット手順

Antigravity が記事を書き上げたら、以下の手順で保存・公開を進めます。

### ① 記事原稿の保存と GitHub へのプッシュ

```sh
git add docs/articles/
git commit -m "docs(articles): add technical deep-dive article for Zenn/Qiita"
git push origin main
```

### ②（任意・推奨）Zenn または Qiita への実際の投稿

1. Zenn（`https://zenn.dev/`）または Qiita（`https://qiita.com/`）にログインします。  
2. `docs/articles/zenn-agentic-portal-architecture.md` の内容をコピー＆ペーストして記事を公開します（Mermaid 図も Zenn / Qiita の両方でそのまま綺麗に描画されます！）。  
3. 記事を公開したら、記事 URL を `README.md` の末尾（Documentation セクションなど）に追記しておくと、GitHub を訪れた採用担当者からの導線が完璧になります。

---

## 5\. いよいよ最終日（Day 5）の予告

Day 4 が完了すれば、残すは **Phase 4 / Day 5（最終日）** のみです！

* **Day 5:** 本番環境へのデプロイ準備（Docker化 / Vercel 等のデプロイ構成）＆ プロジェクト全体の最終チェックリスト完了

まずは Day 4 のプロンプトを Antigravity に送信して、あなたの技術力を世の中に発信する代表作の記事を生成しましょう！
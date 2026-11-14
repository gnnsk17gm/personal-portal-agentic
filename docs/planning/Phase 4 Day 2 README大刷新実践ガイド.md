# Phase 4 Day 2: README.md フルリニューアル実践ガイド

GitHub Actions CI で **緑色のチェックマーク（✔ Passed）** が点灯したことで、あなたのコードの品質とビルド再現性は世界中の誰に対しても客観的に証明されました！

---

## 1\. Phase 4 / Day 2: 採用担当者の心を掴む `README.md` の大刷新

面接官や採用担当者が GitHub リポジトリを訪れたとき、**最初の 30 秒で目を通すのが `README.md`** です。 Day 2 では、これまで構築してきた高度なアーキテクチャ・開発メトリクス・デモ手順を余すことなく伝える、**最高峰のポートフォリオ README** を構築します。

### Day 2 の到達目標（Definition of Done）

- [ ] システム全体像が一目で伝わる **アーキテクチャ図（Mermaid / ASCII）** が `README.md` に掲載されていること  
- [ ] **開発メトリクス & 定量的実績（123テスト全通過、外部API課金 0円、15件のSDD仕様書、13件のADR）** が整理されていること  
- [ ] 面接官やレビュアーがローカルで3分で起動し、キラーデモ（Scenario Simulator & HITL自己修復）を体験できる **Quick Start & Demo Guide** が記載されていること  
- [ ] すべてのドキュメントリンク（`docs/adr/`, `specs/completed/`）が正しく機能すること

---

## 2\. Antigravity への指示プロンプト（Day 2 実行用）

`README.md` の刷新はドキュメント整備であるため、既存の `specs/` や `docs/adr/` の実績をすべて読み込ませた上で、Antigravity に一気にプロフェッショナルな `README.md` を執筆させましょう。

以下のプロンプトをそのままコピーして Antigravity に送信してください：

```
これまで実装してきた全機能（Spec 001〜015）および全意思決定ログ（docs/adr/0001〜0013）の内容を踏まえ、採用担当者およびエンジニアリングマネージャー向けのポートフォリオとして最高水準の `README.md` へ全面リニューアルしてください。

以下のセクションを必ず含め、技術的深度と可読性を両立させてください：

1. **ヘッダー & バッジ:**
   - プロジェクトタイトル、キャッチコピー、`Continuous Integration` 緑バッジ（ユーザー名: `gnnsk17gm`）、主要技術バッジ（Next.js 16, TypeScript Strict, Drizzle ORM, Vitest, MCP）。
2. **プロジェクト概要 & 開発思想 (Core Philosophy):**
   - 単なるAIラッパーアプリではなく、「仕様駆動開発（SDD）」「コンテキストエンジニアリング（Rules/Skills/Hooks）」「マルチエージェント協調」を実証した自律型パーソナルポータルであること。
   - **完全0円（外部LLM API課金ゼロ）** かつ決定論的テスト可能な設計思想。
3. **システムアーキテクチャ図 (Mermaid図):**
   - Web UI（Dashboard, Tasks, Second Brain, Agent Console）
   - Context Layer（Dynamic Context Assembler, Local BM25 RAG）
   - Multi-Agent Engine（Researcher / Planner / Critic, Task Doctor Sweeper, HITL Remediation）
   - Protocol Layer（MCP HTTP JSON-RPC 2.0 + Stdio Bridge）
   - Persistence Layer（SQLite + Drizzle ORM）
4. **定量的開発メトリクス (Engineering Metrics):**
   - 自動テスト: **14テストスイート / 123テスト 100% Green**
   - 完了仕様書（Specs）: **15件** (`specs/completed/`)
   - アーキテクチャ判断記録（ADR）: **13件** (`docs/adr/`)
   - 外部APIランニングコスト: **$0 / month**
5. **主要機能ハイライト & 3分間デモ手順 (Interactive Demo Walkthrough):**
   - `/agent` の **Scenario Simulator** を使った「不健全検知 → AI是正提案 → 人間承認（HITL）自己修復」の実演ステップ。
6. **ローカルセットアップ手順 (Quick Start):**
   - `git clone` から `npm install`、`npm run verify`、`npm run dev` までの最短コマンド。

※コードロジックの変更はないため、更新後に `git diff README.md` とマークダウンのリンク切れがないかを確認して報告してください。
```

---

## 3\. 完了後のコミット & プッシュ手順

Antigravity が `README.md` を書き上げたら、ブラウザで GitHub リポジトリを開いた時の見栄えをイメージしながら内容を確認し、以下のコマンドで公開しましょう：

```sh
git add README.md
git commit -m "docs(readme): overhaul README with architecture diagrams, metrics, and demo walkthrough"
git push origin main
```

GitHub のトップページをリロードすると、Mermaid 図やバッジ、プロジェクトの全貌が美しくレンダリングされます！
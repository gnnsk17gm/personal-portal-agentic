# Personal Portal - Autonomous Agentic Platform

Google Antigravityをはじめとする最先端AIエージェント環境を統合し、個人の情報・タスク・ナレッジを一元管理する自律型パーソナルポータルです。

本プロジェクトは、単なるWebアプリの開発にとどまらず、**「仕様駆動開発（Spec-Driven Development: SDD）」と「コンテキストエンジニアリング（Rules / Skills / Hooks）」を体系的に実践・検証するアーキテクチャ実証実験**として構築されています。

---

## 🎯 設計思想とアプローチ

1. **仕様駆動開発 (Spec-Driven Development):**
   - 人間の役割は「コードの記述」ではなく「仕様と制約の設計」。
   - `specs/` に配置された厳密な仕様書に基づき、AIエージェントが自律的にタスク分解・実装・検証を実行。
2. **階層化コンテキストエンジニアリング:**
   - `.antigravity/rules/`: システム全体で常に厳守される設計憲法・技術規約。
   - `.antigravity/skills/`: 再利用可能な定石開発ワークフロー（CRUD追加、テスト作成等）。
   - `.antigravity/hooks/`: コミットやビルド前に自動検証を行うガードレール。
3. **エージェントオーケストレーション:**
   - 単一エージェントとの対話にとどまらず、Main AgentとSubagentの役割分担による並行開発を実施。

---

## 🛠 技術スタック

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Language:** TypeScript (Strict Mode)
- **Agent Environment:** Google Antigravity / MCP (Model Context Protocol)
- **Database / Vector:** SQLite / PostgreSQL (Prisma or Drizzle), pgvector
- **Testing:** Playwright, Vitest

---

## 📂 ディレクトリ構成

```text
├── .antigravity/          # AIエージェント制御用コンテキスト基盤
│   ├── rules/             # 常時適用される設計・コーディング憲法
│   ├── skills/            # 開発手順書（スキル定義）
│   └── hooks/             # 自動検証フック
├── specs/                 # 仕様駆動開発（SDD）のSSOT（仕様書群）
│   ├── templates/         # 仕様書テンプレート
│   ├── active/            # 実装中の仕様
│   └── completed/         # 実装完了・アーカイブされた仕様
├── docs/                  # 設計ドキュメント・ADR (意思決定記録)
└── src/                   # アプリケーションソースコード
```

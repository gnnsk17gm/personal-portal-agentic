# Phase 1 / Day 1: 開発環境セットアップ & SDD基盤構築ガイド

本ドキュメントは、**「AI駆動開発 × コンテキストエンジニアリング」を実践するための初日（Day 1）実行ワークブック**です。

今日の目標は、単にコードを書くことではなく、「AIエージェントが自律的かつ破綻なく動くための開発環境・ルール・仕様書テンプレート（基盤）」をリポジトリ内に確立することです。

## 1. Day 1 の到達目標（Definition of Done）

* [ ] プロジェクトの前提・課題意識（ポータルで何を解決するか）の言語化
* [ ] Next.js + TypeScript による基盤プロジェクトの初期化
* [ ] `.antigravity/` ルールエンジン用ディレクトリの配備
* [ ] エージェントに厳守させる「基本行動憲法（Rules）」の配備
* [ ] 仕様駆動開発（SDD）の核となる「仕様書テンプレート（Spec Template）」の配備
* [ ] 外部（採用担当者）に開発思想が伝わる `README.md` のコミット

## 2. コア要求の定義（ポータルで何を解決するか）

AIに指示を出す前に、「自分自身が日常で何に困っており、何をこのポータルで集約したいか」を言語化します。以下の3領域からスタートするのが最も実装価値・ポートフォリオ価値が高くなります。

| 対象領域 | 抱えている課題 | 本ポータルでの解決アプローチ | 
| ----- | ----- | ----- | 
| **① タスク & プロジェクト** | 日々のタスク、学習計画、転職準備タスクがバラバラなツールに散在 | 単一のKanban / Listで集約し、AIが毎朝優先度順に並べ替え | 
| **② インプット & ナレッジ** | 技術記事、読書メモ、思いつきのアイデアがメモ帳やブラウザタブに放置 | クイックキャプチャ → AIによる自動タグ付け・要約・関連付け | 
| **③ 朝の状況把握（Briefing）** | メール、カレンダー、直近タスクを巡回確認するのに時間を浪費 | 毎朝1画面を開くだけで「今日の優先事項と要約」を俯瞰表示 | 

## 3. ステップ別セットアップ手順

ターミナルを開き、以下のコマンド順に環境を初期化します。

### Step 1: Next.js プロジェクトの作成

```bash
# プロジェクトディレクトリを作成して初期化
npx create-next-app@latest personal-portal-agentic \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-pnpm # または --use-npm

cd personal-portal-agentic
```

### Step 2: SDDおよびAntigravity管理用ディレクトリの作成

```bash
# Antigravity用のコンテキスト管理ディレクトリ
mkdir -p .antigravity/rules
mkdir -p .antigravity/skills
mkdir -p .antigravity/hooks

# 仕様駆動開発（SDD）用ディレクトリ
mkdir -p specs/templates
mkdir -p specs/active
mkdir -p specs/completed
mkdir -p docs/planning
mkdir -p docs/adr
```

## 4. 配備用ファイルテンプレート

以下の各ファイルをリポジトリ内に配置します。これらが「AIが自律的に正しいコードを書くためのコンテキスト境界」となります。

### File 1: `.antigravity/rules/00-agent-constitution.md`

> **役割:** エージェントの行動規範。勝手な推測や破壊的変更を禁止し、仕様駆動開発を強制する基本原則。

```markdown
# Agent Constitution (基本行動規範)

あなた（AIエージェント）は、本プロジェクトのシニアソフトウェアエンジニアとして振る舞います。
以下の規約は絶対であり、いかなる場合もこれを遵守して作業を実行してください。

## 1. 仕様駆動開発（SDD）の遵守
- `specs/` 配下に承認された仕様書（Specification）が存在しない限り、一切の実装コード（機能追加・修正）を書いてはならない。
- 実装を開始する前に、必ず対象の仕様書を熟読し、タスク分解（Implementation Plan）を人間に提示して承認を得ること。

## 2. 破壊的変更の禁止
- 既存のテストや動作している機能を勝手に削除・改変してはならない。
- リファクタリングを行う場合は、事前に影響範囲を人間に明示し、テストがグリーンであることを確認した上で実行すること。

## 3. コンテキストの節約と正確性
- 推測による実装（暗黙の仮定）を行わない。仕様に曖昧さがある場合は、コードを書く前に必ず人間に質問すること。
- ドキュメントやログを生成する際は、冗長な解説を避け、構造化された情報（Markdown / JSON）で過不足なく提供すること。

## 4. 品質と検証
- コード変更を行った後は、必ず関連する静的解析（Linter, TypeCheck）およびテストがパスすることを確認すること。
- エラーが発生した場合は、表面的なエラー握り潰し（`any` の安易な使用や型キャスト等）を行わず、根本原因を解決すること。
```

### File 2: `.antigravity/rules/10-technical-standards.md`

> **役割:** 技術スタックごとの標準規約。アーキテクチャの統一性を担保する。

```markdown
# Technical Standards (技術規約)

## 1. フロントエンド & UI規約 (Next.js App Router)
- **コンポーネント構成:**
  - 状態を持たない表示用UIは Server Components を優先する。
  - インタラクティブな操作やクライアントフックを要する場合のみ最上部に `"use client"` を明記する。
- **スタイリング:**
  - Tailwind CSS を使用し、インラインスタイルや独自のCSSファイルは作成しない。
  - デザインはシンプル・ミニマル（Modern Dashboard）を基調とし、**デフォルトは通常のライトモード（Light Mode）** を前提とした配色設計とする（将来的なダークモード切り替えにも拡張しやすい構成を意識）。
- **ファイル命名規則:**
  - コンポーネント: `PascalCase.tsx`
  - ユーティリティ・フック: `camelCase.ts`

## 2. TypeScript 規約
- `strict: true` を前提とし、型安全性を最優先する。
- `any` の使用は原則禁止。未知の型を扱う場合は `unknown` を用い、Type Guardで絞り込むこと。
- 型定義は `src/types/` または各機能モジュール近傍に配置する。

## 3. アーキテクチャ原則
- ビジネスロジックをUIコンポーネント内に直接ベタ書きしない。
- データのフェッチや操作は Server Actions または専用の Service レイヤーに分離する。
```

### File 3: `specs/templates/feature-spec-template.md`

> **役割:** 機能実装時に人間が記述（またはAIと対話して策定）する仕様書のマスターテンプレート。

````markdown
# Spec: [機能名]

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:** 
- **ユーザーが得られる価値:** 

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] 基準1: 〇〇が画面に表示されること
- [ ] 基準2: △△をクリックした際、××の処理が実行されること
- [ ] 基準3: エラー発生時に適切なフィードバックが表示されること

## 3. 技術設計 (Technical Design)
### 3.1 データモデル / スキーマ
```typescript
// 必要なエンティティやPropsの型定義
```

### 3.2 影響範囲 / 変更予定ファイル
- `src/app/...`
- `src/components/...`

## 4. 検証手順 (Verification Steps)
エージェントおよび人間が完了を判定するためのコマンド・手順：
1. `npm run lint` がエラーなしで通過すること
2. `npm run type-check` がエラーなしで通過すること
3. ブラウザで `http://localhost:3000/...` にアクセスし、受け入れ基準を満たす動作を確認
````

---

### File 4: `README.md`
> **役割:** 転職市場で評価されるポートフォリオの顔。プロジェクトの思想・アーキテクチャを明示。

````markdown
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
````

---

## 5. Day 1 の完了チェックと次の一歩

上記のファイルを配置し、初期コミットを行います。

```bash
git add .
git commit -m "feat(infra): initialize repository with SDD specs and antigravity rules"
```

### 次のステップ（Day 2 への引き継ぎ）

基盤のセットアップが完了したら、いよいよ「最初の機能（Phase 1の初期ダッシュボード・スケルトン）」の仕様書（Spec）を書き、AIエージェントに実装させる最初のイテレーションに進みます。
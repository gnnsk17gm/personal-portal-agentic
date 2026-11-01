# Phase 1 / Day 5: Second Brain（`/notes`）と Agent Context Inspector（`/agent`）の実装

Day 4までに、ダッシュボード（`/`）、タスク管理（`/tasks`）、そして **Rules / Skills / Hooks（`npm run verify`）による自律検証パイプライン** が完成しました。

Phase 1 の締めくくりとなる Day 5 では、残りの主要ナビゲーションである以下の2画面を一気に構築し、Phase 1（基本ポータル＆SDD基盤）を完成させます。

1. **Second Brain (`/notes`):** ダッシュボードで Quick Capture したメモの一覧・検索・タグ付け・詳細編集ができるナレッジ管理画面  
2. **Agent Status & Logs (`/agent`):** **【転職ポートフォリオの目玉機能】** リポジトリ内の `.antigravity/`（Rules / Skills / Hooks）、`specs/`（完了・進行中仕様書）、`docs/adr/`（意思決定ログ）をリアルタイムに読み取ってWeb画面上に可視化する「コンテキスト・インスペクター」

---

## 1\. なぜ `/agent`（Context Inspector）が最強の差別化になるのか？

一般的なTodoアプリやノートアプリは誰にでも作れます。しかし、ポータル内に **「現在このシステム自身を統治しているAIエージェントのRules・Skills・Hooks・完了Spec・ADRを一覧・閲覧できるメタ管理画面（`/agent`）」** があると、面接官に画面を見せた瞬間にこう説明できます：

> 「このポータル自体が仕様駆動開発（SDD）で作られており、`/agent` タブを開くと、現在エージェントに適用されている憲法（Rules）やスキル、これまで消化した仕様書（Specs）とADRの履歴がすべてシステム上で可視化・監査できるようになっています」

これは他の候補者にはまず真似できない、**コンテキストエンジニアリングの視覚的な証明** になります。

---

## 2\. Day 5 の到達目標（Definition of Done）

- [ ] Day 4 の仕様書（`003`）が `specs/completed/` に移動され、コミットされていること  
- [ ] ナレッジ管理＆エージェント可視化の仕様書 `specs/active/004-notes-and-agent-inspector.md` を作成する  
- [ ] Antigravity に計画・テスト・実装を行わせ、`npm run verify`（Lint \+ TypeCheck \+ Vitest）をパスさせる  
- [ ] `/notes` でメモの検索・追加・削除ができ、`/agent` で `.antigravity/` や `specs/` のファイル群が美しく閲覧できることを確認する

---

## 3\. 仕様書（Spec 004）の作成

今回は少しボリュームがありますが、すでに Service 層やテストの型が固まっているため、1つの仕様書で `/notes` と `/agent`（＋残りの `/settings` プレースホルダー）を定義します。

### File 1: `specs/active/004-notes-and-agent-inspector.md`

以下の内容でファイルを作成してください。

```markdown
# Spec 004: Second Brain (/notes) ナレッジ管理と Agent Context Inspector (/agent) の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. **Second Brain (`/notes`):** ダッシュボードの Quick Capture で素早く書き留めたメモや、日々の技術ノート・学習記録を検索・整理・削除できるナレッジベース画面を提供するため。
  2. **Agent Status & Logs (`/agent`):** 本プロジェクトの核である「コンテキストエンジニアリング（`.antigravity/rules`, `skills`, `hooks`）」および「仕様駆動開発（`specs/completed`, `specs/active`, `docs/adr`）」の定義ファイル群をポータル上からリアルタイムに俯瞰・インスペクト（監査）できるメタ可視化画面を提供するため。
  3. **Settings (`/settings`):** サイドバーの全リンクが404にならないよう、システム環境情報（DBパス、Nodeバージョン、テスト設定等）を表示するシンプルな設定確認画面を用意するため。
- **参照すべきスキル:** `.antigravity/skills/implement-from-spec.md`, `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **Second Brain 画面 (`/notes`):**
  - `captures` テーブルの全メモが新しい順に表示されること。
  - キーワード検索（`?q=keyword`）でメモ本文（`content`）の部分一致フィルタリングができること。
  - `/notes` 画面からも新規ノートの追加（長文対応）および既存ノートの削除ができ、`/`（ダッシュボード）と `/notes` の両方が revalidate されること。
  - `src/services/__tests__/captureService.test.ts` が追加され、メモの保存・一覧取得・検索・削除の単体テストがパスすること。
- [ ] **Agent Status & Logs 画面 (`/agent`):**
  - Node.js の `fs` モジュール（Server Component）を用いて、プロジェクト内の以下のディレクトリから Markdown / Shell ファイル一覧と中身を読み取り、カテゴリ別に美しく表示できること：
    - **Rules:** `.antigravity/rules/*.md`
    - **Skills:** `.antigravity/skills/*.md`
    - **Hooks:** `.antigravity/hooks/*`
    - **Specs (Active / Completed):** `specs/active/*.md`, `specs/completed/*.md`
    - **ADRs:** `docs/adr/*.md`
  - 各ファイルのタイトル（またはファイル名）と、クリック/展開（またはカード表示）で内容のテキスト（コードブロックまたは整形テキスト）が閲覧できること。
- [ ] **Settings 画面 (`/settings`):**
  - 404にならず、現在のポータル構成情報（Database: SQLite + Drizzle、Test Runner: Vitest、SDD Status等）がクリーンに表示されること。
- [ ] **品質ゲート:**
  - `npm run verify`（ESLint + TypeScript + Vitest）がすべてエラーなしでパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- 追加パッケージなし（既存の `lucide-react`、Tailwind CSS、Node.js 標準の `node:fs/promises`, `node:path` で実装すること）。

### 3.2 サービス層の拡張・新規作成
1. `src/services/captureService.ts` の拡張:
   - 既存の `saveCapture`, `getRecentCaptures` に加え、`getAllCaptures(searchQuery?: string, db?)`, `deleteCapture(id: number, db?)` を実装。
   - `taskService.ts` と同様、オプション引数 `db = getDb()` による DI（テスト容易性）をサポートすること。
2. `src/services/agentContextService.ts` の新規作成:
   - ローカルの `.antigravity/`, `specs/`, `docs/adr/` ディレクトリを安全に走査し、ファイル名・カテゴリ・文字数・中身（content）を構造化して返すサーバー専用サービス。

### 3.3 作成・変更予定ファイル
- `src/services/captureService.ts` (変更: 全件取得・検索・削除、DI対応)
- `src/services/__tests__/captureService.test.ts` (新規: `captureService` の単体テスト)
- `src/services/agentContextService.ts` (新規: `.antigravity/`, `specs/`, `docs/adr/` のファイル読み取りサービス)
- `src/app/actions.ts` (変更: ノート追加・削除アクションの拡張と `/notes`, `/` の revalidate)
- `src/app/notes/page.tsx` (新規: Second Brain メイン画面)
- `src/components/notes/*` (新規: ノート検索バー、新規作成フォーム、ノート一覧・削除ボタン)
- `src/app/agent/page.tsx` (新規: Agent Context Inspector 画面)
- `src/components/agent/*` (新規: ファイルインスペクター表示用コンポーネント)
- `src/app/settings/page.tsx` (新規: システム構成・設定確認画面)

## 4. 検証手順 (Verification Steps)
1. `npm run verify` がすべて Green であること（`taskService.test.ts` と `captureService.test.ts` の両方がパスすること）。
2. ブラウザで `/notes`, `/agent`, `/settings` のすべてが 200 OK で表示され、サイドバーの全メニューが機能すること。
```

&nbsp;

---

## 4\. Antigravity への指示（プロンプト実行）

1. Day 4 の仕様書移動（`mv specs/active/003-tasks-page-and-unit-tests.md specs/completed/`）と Git コミットを完了させる。  
2. 上記の `specs/active/004-notes-and-agent-inspector.md` を作成する。  
3. 以下のプロンプトを Antigravity に投げる。

### 💬 エージェントへの指示プロンプト（コピペ用）

```
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@specs/active/004-notes-and-agent-inspector.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
```

&nbsp;
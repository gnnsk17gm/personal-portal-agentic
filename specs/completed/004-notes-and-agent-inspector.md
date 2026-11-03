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

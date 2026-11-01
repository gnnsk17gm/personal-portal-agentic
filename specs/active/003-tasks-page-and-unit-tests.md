# Spec 003: タスク管理ページ（/tasks）の実装と Vitest 自動検証基盤の構築

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. ダッシュボード（`/`）だけでなく、タスクの新規追加・優先度設定・期限設定・ステータス管理・削除を行える専用の「Tasks & Projects（`/tasks`）」画面を提供するため。
  2. AIエージェントが実装したビジネスロジック（`taskService` / `captureService`）の品質を機械的に担保するため、Vitestによる単体テストと一括検証スクリプト（`npm run verify`）を導入する。
- **参照すべきスキル:** `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **タスク一覧・フィルタ表示 (`/tasks`):**
  - サイドバーの「Tasks & Projects」から `/tasks` に遷移できること（404にならないこと）。
  - 全タスクが一覧表示され、ステータス別（すべて / 未完了 `todo` & `in_progress` / 完了済み `done`）または優先度が見やすく整理されていること。
- [ ] **タスクの新規作成フォーム:**
  - `/tasks` 画面上部（またはモーダル/カード内）から「タイトル（必須）」「優先度（high / medium / low）」「期限日（任意: YYYY-MM-DD）」を入力して新規タスクを追加できること。
- [ ] **タスクのステータス変更 & 削除:**
  - タスクの完了/未完了トグル、および不要なタスクの削除ボタンが動作し、即座に画面（`/tasks` と `/` の両方）に反映されること。
- [ ] **自動テスト基盤（Vitest）と品質フックの稼働:**
  - `vitest` が導入され、`src/services/__tests__/taskService.test.ts` にタスク作成・取得・ステータス切替・削除の単体テストが実装されていること（本番の `sqlite.db` を汚さないようテスト時はインメモリDBまたは環境変数で切り替えられる設計にすること）。
  - `package.json` に `"test:run": "vitest run"` および `"verify": "bash .antigravity/hooks/verify-all.sh"` が定義され、エラーなくパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- Development: `vitest`

### 3.2 サービス層の拡張 (`src/services/taskService.ts`)
既存の `taskService.ts` に以下の操作を揃える（既にあるものは活用・拡張）：
- タスク一覧の取得（全件取得、優先度・作成日ソート）
- タスクの新規作成 (`createTask`)
- タスクのステータス切り替え (`toggleTaskStatus` または `updateTaskStatus`)
- タスクの削除 (`deleteTask`)
※テスト容易性（Testability）のため、DBインスタンスを引数注入（DI）できるか、環境変数 `NODE_ENV === 'test'` 時に `:memory:` DBを使用するよう `src/db/index.ts` を工夫すること。

### 3.3 作成・変更予定ファイル
- `package.json` (変更: `vitest` 追加、`test`, `test:run`, `verify` スクリプト追加)
- `vitest.config.ts` (新規: `@/*` パスエイリアス解決を含むVitest設定)
- `src/db/index.ts` (変更: テスト実行時に本番DBを汚染しない仕組みの対応)
- `src/services/taskService.ts` (変更: タスク追加・削除・全件取得関数の追加)
- `src/services/__tests__/taskService.test.ts` (新規: Service層の単体テスト)
- `src/app/actions.ts` (変更: `createTaskAction`, `deleteTaskAction` の追加と `revalidatePath('/tasks')`, `revalidatePath('/')`)
- `src/app/tasks/page.tsx` (新規: タスク管理メインページ)
- `src/components/tasks/*` (新規: タスク作成フォーム、タスク一覧・フィルタ、削除ボタン等のコンポーネント)

## 4. 検証手順 (Verification Steps)
1. `npm run verify`（`.antigravity/hooks/verify-all.sh`）を実行し、ESLint、TypeScript型チェック、Vitest単体テストの3つがすべてパスすること。
2. ブラウザで `http://localhost:3000/tasks` にアクセスし、タスクの新規追加・完了切替・削除が正常に動作すること。

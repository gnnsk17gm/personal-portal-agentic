# Spec 017: 自宅用「基本モード」と3列正方形タイルダッシュボードの実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. 自宅での日常利用に最適化された、シンプルでノイズのない「基本モード（Standard Mode）」をポータルのデフォルト表示として提供するため。
  2. 左ナビゲーションの目立たない位置に切替ボタンを設け、普段は「基本モード」、必要時のみ「Portfolioモード」へ切り替えられるようにするため。
  3. ダッシュボード（`/`）を3列正方形のタイル形式とし、機能追加に合わせて下へスクロール拡張でき、かつタイルの余白クリックで各機能画面へ遷移できる直感的なUIを構築するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0015-dual-mode-ui-and-square-tile-dashboard.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **デュアルモード切替機能（Cookie 永続化）:**
  - モード種別は `'standard'`（基本モード：デフォルト）と `'portfolio'`（ポートフォリオモード）の2種類とする。
  - 左サイドバーの最下部（目立たない位置に小さめの控えめなスタイル）にモード切替ボタンを配置すること：
    - 基本モード時: ボタンラベルは `Portfolio`（クリックするとポートフォリオモードへ切替）。
    - ポートフォリオモード時: ボタンラベルは `基本`（クリックすると基本モードへ切替）。
  - 切替操作は Server Action（または Cookie 更新 + `router.refresh()`）で行われ、ページリロード後も選択したモードが維持されること。
- [ ] **左サイドバーのメニュー最適化:**
  - **基本モード時:** 普段使いに必要な最小限のメニュー（例: `Home`, `Tasks`, `Notes`, `Settings`）のみを表示し、`Agent Status & Logs` や `AI Agent Ready` バッジ等のポートフォリオ・AI要素は非表示にすること。
  - **ポートフォリオモード時:** 従来通りの全メニューとヘッダーバッジを表示すること。
- [ ] **基本モードのダッシュボード（3列正方形タイル形式）:**
  - 基本モード時のトップページ（`/`）は、デスクトップ幅で **3列の正方形タイル（`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` + `aspect-square`）** で構成されること。
  - タイルが増えた場合、下方向にグリッド行が追加され自然に縦スクロールできること。
  - 初期配置する基本タイル（AI要素は一切含めない）：
    1. **Tasks タイル（`/tasks` へ遷移）:** 未完了タスクの直近リスト表示と完了チェック操作。
    2. **Notes タイル（`/notes` へ遷移）:** クイックメモ入力欄・保存ボタンと最新メモのプレビュー。
    3. **Today's Schedule タイル（`/settings` または予定確認用プレースホルダー）:** 本日のスケジュール一覧表示（シンプル表示）。
    *(※将来拡張用のプレースホルダータイル、または4枚目以降が追加された際にそのまま3列グリッドの2行目以降に並ぶ構造とすること)*
- [ ] **タイル余白クリックによる画面遷移（インタラクティブ要素との共存）:**
  - 各タイルの余白部分やタイトルヘッダーをクリックすると、対応する詳細ページ（例: `/tasks`, `/notes`）へ遷移すること。
  - タイル内のチェックボックス、テキスト入力欄、保存ボタンをクリックした際は画面遷移せず、その場で操作が完結すること（イベントバブリングの適切な制御）。
- [ ] **既存画面でのAI要素の抑制（基本モード時）:**
  - 基本モード時は、`/tasks` ページの「Goal Decomposition Agent（目標自動分解フォーム）」および「Agent Execution Timeline」、`/notes` ページの「BM25 Relevance スコアバッジ」を非表示にし、シンプルなタスク管理・メモ帳として表示すること。
- [ ] **品質ゲート:**
  - 既存の全単体テスト（127件）およびモード判定ヘルパー等の新規テストを含め、`npm run verify`（ESLint + TypeScript + Vitest）がすべてエラーゼロでパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- なし（Next.js 標準の `cookies()` from `next/headers` と Tailwind CSS で実装）。

### 3.2 モード管理設計 (`src/lib/portalMode.ts` & Server Action)
- Cookie 名: `portal_mode`（値: `'standard' | 'portfolio'`、未設定時のデフォルトは `'standard'`）。
- `setPortalModeAction(mode: 'standard' | 'portfolio')`: `cookies().set('portal_mode', mode, { path: '/', maxAge: 60 * 60 * 24 * 365 })` を実行し、`revalidatePath('/', 'layout')` を呼ぶ。

### 3.3 タイルコンポーネント設計 (`src/components/dashboard/DashboardTile.tsx`)
- `href`（遷移先URL）、`title`、`icon`、`children` を受け取る共通正方形タイル枠（`aspect-square flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md cursor-pointer`）。
- カード全体の `onClick` で `router.push(href)` を実行。
- 内部のフォームやボタンコンテナには `onClick={(e) => e.stopPropagation()}` を付与し、操作時の誤遷移を防止。

### 3.4 作成・変更予定ファイル
- `src/lib/portalMode.ts` (新規: モード型定義・Cookie値パース純粋関数)
- `src/lib/__tests__/portalMode.test.ts` (新規: モード判定の単体テスト)
- `src/app/actions.ts` (変更: `togglePortalModeAction` の追加)
- `src/components/layout/Sidebar.tsx` (変更: モードに応じたメニュー出し分け＋最下部の控えめな `Portfolio` / `基本` 切替ボタン)
- `src/components/layout/Header.tsx` (変更: 基本モード時は `AI Agent Ready` バッジを非表示)
- `src/app/layout.tsx` (変更: Cookie から現在モードを読み取り Sidebar / Header へ渡す)
- `src/components/dashboard/DashboardTile.tsx` (新規: 3列正方形・余白クリック遷移対応の共通タイル枠)
- `src/components/dashboard/StandardHomeGrid.tsx` (新規: 基本モード用の3列正方形タイルグリッドと各機能タイル)
- `src/app/page.tsx` (変更: モードに応じて `StandardHomeGrid` と従来のポートフォリオダッシュボードを切り替え)
- `src/app/tasks/page.tsx`, `src/app/notes/page.tsx` (変更: 基本モード時はAI・エージェント関連UIを非表示)

## 4. 検証手順 (Verification Steps)
1. `npm run verify`（ESLint + TypeScript + Vitest）がすべてエラーゼロでパスすること。
2. ブラウザで `http://localhost:3000` を開いた際、デフォルトで「基本モード（3列正方形タイルUI）」が表示され、AI関連要素が一切見えないこと。
3. タスクタイルの余白をクリックすると `/tasks` へ遷移し、チェックボックスをクリックすると遷移せずに完了状態が切り替わること。
4. 左サイドバー最下部の控えめな `Portfolio` ボタンを押すとポートフォリオモードへ切り替わり、`基本` ボタンを押すと再び自宅用基本モードへ戻ること。

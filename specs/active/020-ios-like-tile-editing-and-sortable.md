# Spec 020: iPhone風タイル編集（長押し開始・リアルタイム並び替え・背景クリック終了）の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  - ダッシュボードのカスタマイズ体験を、スマートフォンのホーム画面のように直感的かつ洗練された操作感（長押しで編集開始、ドラッグ中のリアルタイム並び替えアニメーション、背景クリックで編集終了）へ刷新するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0017-ios-like-sortable-grid-and-long-press.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **パッケージ導入:**
  - `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` がインストールされていること。
- [ ] **タイル長押し（500ms）による編集モード開始:**
  - 画面上部の「編集」ボタンを廃止すること。
  - 通常モード時、任意のタイルを約 500ms 長押し（`onPointerDown` から 500ms 経過、移動距離 10px 未満）すると `isEditing = true` に切り替わること。
  - 500ms 未満で離した場合は通常のクリック（詳細ページ遷移）として動作し、長押し成立直後の `click` イベントによる誤遷移は抑止されること。
  - タイル内のインタラクティブ要素（チェックボックス・テキスト入力欄・ボタン等）を押下した際は長押し編集を発火させないこと。
- [ ] **ドラッグ＆ドロップによるリアルタイム並び替えアニメーション:**
  - 編集モード中、`DndContext` と `SortableContext`（`rectSortingStrategy`）によりタイルをドラッグ移動できること。
  - ドラッグ中のタイルを他のタイルの上へ動かすと、リアルタイムで他のタイルが CSS `transform` / `transition` により滑らかに避けて位置が入れ替わること。
  - ドラッグ終了（ドロップ）時に確定した順序が `updateDashboardTilesAction` 経由で Cookie に永続化されること。
- [ ] **矢印ボタンの廃止 & 削除バッジ UI:**
  - 左右移動用の矢印ボタン（`←` `→`）を完全に削除すること。
  - 編集モード中は各タイルの左上（または右上）に円形の「削除（`×`）」バッジが表示され、クリックでタイルを非表示にできること。
  - 編集モード中はグリッド末尾の「＋ タイルを追加」スロットおよび「初期配置にリセット」操作が利用できること。
- [ ] **ダッシュボードの何もない場所（余白背景）クリックで編集モード終了:**
  - 編集モード中にタイルカード・追加スロット・ボタン以外のダッシュボード背景余白をクリックすると、`isEditing = false` に戻り通常モードへ復帰すること。
- [ ] **品質ゲート:**
  - 既存の単体テスト（`dashboardTiles.test.ts` 等）および新規ロジックのテストを含め、`npm run verify`（ESLint + TypeScript + Vitest）と `npm run build` がエラーゼロでパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 依存パッケージ
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

### 3.2 コンポーネント設計
- `SortableDashboardTile.tsx`（または `DashboardTile.tsx` の改修）:
  - `useSortable({ id, disabled: !isEditing })` を使用し、`CSS.Transform.toString(transform)` と `transition` をスタイル適用。
  - 通常モード時は長押し検出タイマー（500ms）をアタッチ。長押し成立時は `onEnterEditMode()` を呼び出し、直後の `onClickCapture` でページ遷移をブロック。
  - 編集モード時は `attributes` と `listeners` をタイルに適用し、ドラッグ中は `DragOverlay` または浮き上がりスタイル（`z-50 scale-105 shadow-xl opacity-90`）で表示。
- `EditableTileGrid.tsx`:
  - `DndContext`（SSRハイドレーション不一致防止のため `id="dashboard-tile-dnd"` を指定）と `SortableContext`（`strategy={rectSortingStrategy}`）を配置。
  - `onDragOver` または `onDragEnd` で `reorderTiles` を呼び出して即座に配列を更新し、ドロップ確定時に `updateDashboardTilesAction` を実行。
  - 外側コンテナの `onClick`（ターゲットがコンテナ自身またはグリッド余白である場合）で `setIsEditing(false)` を実行。

### 3.3 作成・変更予定ファイル
- `package.json` (変更: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 追加)
- `src/components/dashboard/DashboardTile.tsx` (変更: 矢印ボタン廃止、長押し検知、削除バッジUI対応)
- `src/components/dashboard/EditableTileGrid.tsx` (変更: `DndContext` / `SortableContext` 統合、編集ボタン廃止、背景クリックでの編集終了対応)
- `src/lib/dashboardTiles.ts` (必要に応じた補助関数追加・整理)

## 4. 検証手順 (Verification Steps)
1. `npm run verify` と `npm run build` がすべてエラーゼロでパスすること。
2. ブラウザで `/`（基本モード）を開き、以下を確認：
   - 画面に「編集」ボタンや「← →」ボタンが存在しないこと。
   - タイルを 0.5 秒長押しすると編集モードに入り、削除（×）バッジと追加スロットが出現すること。
   - タイルをドラッグすると他のタイルがアニメーションでスッと避けて並び替わり、ドロップ後にリロードしても順序が維持されること。
   - 編集モード中にグリッドの何もない余白をクリックすると編集モードが終了すること。

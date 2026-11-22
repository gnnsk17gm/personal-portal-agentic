# Spec 019: ダッシュボードタイルのドラッグ＆ドロップ並び替え機能の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  - Spec 018 で実装したダッシュボード編集モードにおいて、左右の矢印ボタン（1マスずつの移動）だけでなく、マウスによるドラッグ＆ドロップ（Drag & Drop）で任意のタイル位置へ直感的に並び替えられるようにするため。
- **参照すべきADR・スキル:**
  - `docs/adr/0016-dashboard-tile-customization.md`（外部依存ゼロ方針の継承）
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **配列並び替え純粋関数の追加 (`src/lib/dashboardTiles.ts`):**
  - `reorderTiles(tiles: readonly DashboardTileId[], fromIndex: number, toIndex: number): DashboardTileId[]`（または ID 指定の `moveTileTo`）が実装され、イミュータブル（元の配列を破壊しない）に任意のインデックス間での要素移動ができること。
  - 範囲外インデックスや同一インデックス指定時にも安全に動作すること。
- [ ] **編集モード中のドラッグ＆ドロップ操作 (`DashboardTile.tsx` & `EditableTileGrid.tsx`):**
  - 編集モード（`isEditing === true`）のときのみ、各タイルが `draggable={true}` になり、ドラッグ可能なカーソル（`cursor-grab active:cursor-grabbing`）になること。
  - 通常モード（`isEditing === false`）のときは `draggable={false}` であり、テキスト選択やクリック操作を一切妨げないこと。
  - ドラッグ中のタイル（ドラッグ元）は半透明（`opacity-50` 等）になり、ドラッグオーバー中のターゲットタイルにはドロップ先を示すハイライト枠（`ring-2 ring-blue-500` 等）が表示されること。
  - ドロップ時に配列が更新され、即座に `updateDashboardTilesAction` 経由で Cookie に永続化されること。
  - 既存の `←` `→` 移動ボタンもアクセシビリティおよびタッチ操作用に維持すること。
- [ ] **単体テストと品質ゲート:**
  - `src/lib/__tests__/dashboardTiles.test.ts` に `reorderTiles` の単体テスト（前方移動、後方移動、行をまたぐ移動、境界値・範囲外）を追加すること。
  - `npm run verify`（ESLint + TypeScript + Vitest）がすべてエラーゼロでパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- なし（HTML5 標準の Drag & Drop API と Tailwind CSS で実装）。

### 3.2 変更予定ファイル
- `src/lib/dashboardTiles.ts` (変更: `reorderTiles` 純粋関数の追加)
- `src/lib/__tests__/dashboardTiles.test.ts` (変更: `reorderTiles` のテストケース追加)
- `src/components/dashboard/DashboardTile.tsx` (変更: `draggable` および `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd` イベントハンドラ、ドラッグ中・ドロップ先ハイライトのスタイル追加)
- `src/components/dashboard/EditableTileGrid.tsx` (変更: `draggedId` / `dragOverId` の状態管理とドロップ時の `reorderTiles` + Server Action 永続化呼び出し)

## 4. 検証手順 (Verification Steps)
1. `npm run verify`（ESLint + TypeScript + Vitest）がすべてエラーゼロでパスすること。
2. ブラウザで `/`（基本モード）を開き、「編集」ボタンを押してタイルをドラッグ＆ドロップし、離れた位置や別の行へ直感的に並び替えられること、およびページリロード後も順序が維持されることを確認。

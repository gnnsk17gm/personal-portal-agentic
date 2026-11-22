# Spec 018: ダッシュボード編集機能（タイルの並び替え・削除・追加）の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. 基本モードのダッシュボード（3列正方形タイル）において、ユーザーが自身の好みに合わせてタイルの並び順を変更したり、不要なタイルを削除（非表示化）したり、必要なタイルを追加できるようにするため。
  2. 今後の機能追加を見据え、拡張しやすい「タイルレジストリ（Tile Registry）」基盤を確立するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0016-dashboard-tile-customization.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **タイルレジストリと純粋関数 (`src/lib/dashboardTiles.ts`):**
  - 利用可能なタイル定義（ID、タイトル、説明、遷移先href）を一元管理すること。初期タイルは以下の4種（デフォルト表示は上位3種、4種目は追加可能なタイルとして用意）：
    1. `tasks`: **Tasks**（未完了タスク一覧・完了操作 / `/tasks`）
    2. `notes`: **Notes**（クイックメモ入力・最新メモ / `/notes`）
    3. `schedule`: **Today's Schedule**（本日期限タスク・予定 / `/tasks`）
    4. `memo_pad`: **Quick Scratchpad**（ちょっとした自由メモ・伝言板タイル / `/notes`、初期状態では未配置で「追加」から選べるようにする）
  - 配列操作の純粋関数（`parseDashboardTiles`, `moveTileLeft`, `moveTileRight`, `removeTile`, `addTile`）が実装され、不正なIDや重複を安全にフィルタリングすること。
- [ ] **編集モードの切り替え UI:**
  - 基本モードのダッシュボード右上に **「編集」**（編集モード中は **「完了」**）ボタンを配置すること。
  - 編集モード中は、**「初期配置に戻す（リセット）」** ボタンも表示されること。
- [ ] **タイルの並び替え・削除（非表示）・追加操作:**
  - **編集モード中:**
    - タイルの通常遷移（余白クリック）は無効化され、編集操作に集中できること。
    - 各タイルの上部（またはフッター）に **「←（前へ移動）」「→（後ろへ移動）」「×（削除）」** ボタンが表示され、クリックで即座に順序変更・削除ができること。
    - グリッドの末尾（または編集パネル）に **「＋ タイルを追加」** UIが表示され、現在ダッシュボードに配置されていないタイル（削除したタイルや `memo_pad` 等）を選んで追加できること（全タイル配置済みの場合はその旨を表示）。
  - **通常モード中:**
    - 編集用ボタンは一切表示されず、Spec 017 と同じクリーンな正方形タイルとして機能すること。
- [ ] **永続化（Cookie + Server Action）:**
  - 変更されたタイル配列は Server Action（`updateDashboardTilesAction`）経由で Cookie（`dashboard_tiles`）に保存され、ページをリロードしても並び順や追加・削除状態が維持されること。
- [ ] **単体テストと品質ゲート:**
  - `src/lib/__tests__/dashboardTiles.test.ts` を追加し、パース・移動（境界値含む）・削除・重複防止付き追加の単体テストがすべてパスすること。
  - `npm run verify`（ESLint + TypeScript + Vitest）がすべてエラーゼロでパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 作成・変更予定ファイル
- `src/lib/dashboardTiles.ts` (新規: タイル定義レジストリ、デフォルト配列、並び替え・追加・削除・パースの純粋関数)
- `src/lib/__tests__/dashboardTiles.test.ts` (新規: 純粋関数の単体テスト)
- `src/lib/dashboardTilesServer.ts` (新規: `await cookies()` からタイル配列を取得する Server ヘルパー)
- `src/app/actions.ts` (変更: `updateDashboardTilesAction(tileIds: DashboardTileId[])` の追加)
- `src/components/dashboard/DashboardTile.tsx` (変更: `isEditing` props 対応。編集中はクリック遷移を無効化し、左右移動・削除コントロールを表示)
- `src/components/dashboard/StandardHomeGrid.tsx` & クライアントラッパー (変更: 編集モードトグル、タイル追加スロット、並び替え・削除・リセット操作の統合)

## 4. 検証手順 (Verification Steps)
1. `npm run verify` がすべてエラーゼロでパスすること。
2. ブラウザで `/`（基本モード）を開き、「編集」ボタンを押してタイルの左右入れ替え・削除・追加（`Quick Scratchpad` や削除したタイルの再追加）を行い、「完了」を押してリロードしても構成が維持されることを確認。

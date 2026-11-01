# Spec 001: ポータル基本レイアウト & ダッシュボード骨格の構築

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:** パーソナルポータルの全機能（ブリーフィング、タスク管理、ナレッジベース）を統合・遷移するための基本レイアウト骨格（App Shell）を確立するため。
- **ユーザーが得られる価値:** 毎朝ポータルを開いた際に、今日の日付・全体状況・各機能へのナビゲーションが一目で把握できるクリーンな画面を提供する。

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **ライトモード基調のクリーンなUI:** 背景は明るいトーン（`bg-slate-50` や `bg-white` 基調）、テキストは視認性の高いダークグレー（`text-slate-900` 等）で統一されていること。
- [ ] **左サイドバーナビゲーション:** 以下のメニューが表示され、現在のアクティブ項目が視覚的にわかること。
  - Dashboard (Home)
  - Tasks & Projects
  - Second Brain (Notes)
  - Agent Status & Logs
  - Settings
- [ ] **トップヘッダー:** 現在のページタイトル、今日の日付表示、および「AI Agent Ready」のステータスバッジが表示されていること。
- [ ] **メインダッシュボード（3カラム/グリッド骨格）:** トップページ（`/`）に以下の3つのウィジェット領域（プレースホルダーカード）が配置されていること。
  1. **Morning Briefing（朝の要約）:** 今日の予定と優先事項のサマリー枠（ダミーデータ表示）
  2. **Priority Tasks（優先タスク）:** 直近のタスク一覧枠（ダミーデータ3件程度表示）
  3. **Quick Capture（クイックメモ）:** 思いつきやメモを即座に入力できるテキストエリアと保存ボタンのUI骨格（状態管理やDB保存は次フェーズ以降、今回はUIのみ）

## 3. 技術設計 (Technical Design)
### 3.1 依存パッケージ
- アイコン表示用に `lucide-react` をインストールして使用すること。

### 3.2 データモデル / スキーマ
```typescript
// src/types/portal.ts
export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
}

export interface TaskPreview {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
}
```

### 3.3 影響範囲 / 作成・変更予定ファイル
- `src/types/portal.ts` (新規: 基本型定義)
- `src/components/layout/Sidebar.tsx` (新規: サイドバーナビゲーション)
- `src/components/layout/Header.tsx` (新規: トップヘッダー)
- `src/components/dashboard/BriefingCard.tsx` (新規: ブリーフィング枠)
- `src/components/dashboard/PriorityTasksCard.tsx` (新規: 優先タスク枠)
- `src/components/dashboard/QuickCaptureCard.tsx` (新規: クイックメモ枠)
- `src/app/layout.tsx` (変更: 全体フォント・メタデータ・ベースレイアウト調整)
- `src/app/page.tsx` (変更: ダッシュボード画面の構築)

## 4. 検証手順 (Verification Steps)
1. `npm run lint` がエラーなしで通過すること。
2. `npx tsc --noEmit` がエラーなしで通過すること。
3. `npm run dev` で開発サーバーを起動し、`http://localhost:3000` でサイドバー・ヘッダー・3つのダッシュボードカードが崩れずライトモードで表示されること。

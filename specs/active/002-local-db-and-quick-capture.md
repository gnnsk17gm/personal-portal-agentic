# Spec 002: SQLite + Drizzle ORM によるDB基盤構築とダッシュボード機能の永続化

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:** Day 2で作成したダッシュボードのダミー表示（優先タスク、クイックキャプチャ）を実際のデータベース（SQLite）と接続し、データの保存・更新ができる実用的なポータルへ進化させるため。
- **参照すべきADR:** `docs/adr/0002-database-and-orm-selection.md` の決定事項に従うこと。

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **DB基盤とマイグレーション:**
  - `drizzle-orm` と `better-sqlite3` が導入され、ローカルの `sqlite.db`（Git管理外）に `tasks` テーブルと `captures`（クイックメモ）テーブルが作成されること。
  - DBが空の状態でアプリを起動（またはデータ取得）した際、自動的に初期サンプルデータ（タスク3件程度）がシード（投入）されるか、シード用スクリプトが用意されていること。
- [ ] **Priority Tasks（優先タスク）の動的表示と完了操作:**
  - ダッシュボードの `PriorityTasksCard` がDBから未完了タスク（または直近タスク）を取得して表示すること。
  - 各タスクのチェックボックス（またはステータス変更ボタン）をクリックすると、Server Action 経由でDBの `status` が `'done'` / `'todo'` に切り替わり、画面に即時反映（`revalidatePath('/')`）されること。
- [ ] **Quick Capture（クイックメモ）の保存と直近履歴表示:**
  - `QuickCaptureCard` のテキストエリアにメモを入力して保存ボタンを押すと、Server Action 経由でDBの `captures` テーブルに保存され、入力欄がクリアされること。
  - カードの下部に「直近保存したメモ（最新3件）」が一覧表示され、保存直後にリストが更新されること。

## 3. 技術設計 (Technical Design)
### 3.1 依存パッケージ
- Production: `drizzle-orm`, `better-sqlite3`
- Development: `drizzle-kit`, `@types/better-sqlite3`

### 3.2 データベーススキーマ (`src/db/schema.ts`)
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  priority: text('priority', { enum: ['high', 'medium', 'low'] }).notNull().default('medium'),
  status: text('status', { enum: ['todo', 'in_progress', 'done'] }).notNull().default('todo'),
  dueDate: text('due_date'),
  createdAt: text('created_at').notNull(),
});

export const captures = sqliteTable('captures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

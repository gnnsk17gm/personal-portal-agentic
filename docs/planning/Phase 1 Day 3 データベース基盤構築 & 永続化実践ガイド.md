# Phase 1 / Day 3: データベース基盤構築（ADR策定）& 最初のデータ永続化（Spec 002）

Day 2で「UIの骨格（見た目）」が完成しました。 Day 3では、ポータルに入力したタスクやメモを実際に保存できるようにするため、**ローカルデータベース（SQLite）とORM（Drizzle ORM）を導入し、Next.js の Server Actions を通じてデータを永続化する仕組み** を構築します。

また、本日は転職ポートフォリオとして非常に重要な **「なぜ Prisma ではなく Drizzle ORM \+ SQLite を選んだのか」を記録する ADR（Architecture Decision Record）** を作成し、エージェントにもその設計判断を共有します。

---

## 1\. Day 3 の到達目標（Definition of Done）

- [ ] Day 2 の仕様書（`001-dashboard-layout-skeleton.md`）が `specs/completed/` に移動されていることを確認する  
- [ ] データベースとORMの選定理由を記した `docs/adr/0002-database-and-orm-selection.md` を作成する  
- [ ] バックエンド・データ操作の規約を `.antigravity/rules/10-technical-standards.md` に追記（または新ルール追加）する  
- [ ] データ永続化の仕様書 `specs/active/002-local-db-and-quick-capture.md` を作成する  
- [ ] Antigravity に計画・実装させ、ダッシュボード上から「Quick Capture（メモ）」と「Priority Tasks（タスク）」の追加・完了切り替えができるようにする

---

## 2\. 事前確認：Day 2 の締めくくり（未実施の場合のみ）

もし Day 2 の完了後に仕様書の移動を行っていなければ、ターミナルで以下を実行して `active/` を空にしておきます。

```sh
mv specs/active/001-dashboard-layout-skeleton.md specs/completed/
```

---

## 3\. 意思決定の記録：ADR 0002 の作成

AIに「なんとなくDBを入れて」と指示するのではなく、アーキテクトとして技術選定の根拠を定義します。今回は **SQLite (`better-sqlite3`) \+ Drizzle ORM** を採用します。

### File 1: `docs/adr/0002-database-and-orm-selection.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0002: ローカルファーストDBおよびORMの選定 (SQLite + Drizzle ORM)

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-01
- **決定者:** Project Architect

## 1. コンテキスト (Context)
パーソナルポータルにおいて、タスク（Tasks）やクイックメモ（Notes/Captures）を永続化する必要がある。
個人用コマンドセンターとして高速に動作し、ローカル開発環境で外部コンテナ（Docker等）を立ち上げなくても即座に稼働でき、かつ将来的にクラウドDB（Turso / PostgreSQL等）へ移行しやすい構成が求められる。また、AIエージェントがスキーマ定義とクエリを正確に記述できる型安全性が必須である。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: SQLite (`better-sqlite3`) + Drizzle ORM**
  - TypeScriptのみでスキーマを定義でき、SQLライクで軽量・高速。
- **Option 2: SQLite + Prisma**
  - 独自スキーマ言語（`.prisma`）とRustエンジンを使用。学習データは多いが、`prisma generate` の再実行忘れによるAIエージェントの型エラーが起きやすい。
- **Option 3: Docker PostgreSQL + Drizzle ORM**
  - 本番環境に近いが、ローカル起動の手間が増え、初期フェーズのイテレーション速度が落ちる。

## 3. 決定内容 (Decision)
**Option 1（SQLite `better-sqlite3` + Drizzle ORM）を採用する。**

### 選定理由:
1. **AIエージェントとの親和性（Pure TypeScript Schema）:**
   - Drizzleはスキーマ定義自体がTypeScriptファイル（`src/db/schema.ts`）であるため、Prismaのようにコード生成コマンド（`prisma generate`）を挟まずとも即座にTypeScriptの型推論が効く。これによりAIエージェントの実装ループが高速かつ正確になる。
2. **ゼロコンフィグのローカル実行:**
   - 単一ファイル（`sqlite.db`）で動作するため、環境構築の依存関係が最小化される。
3. **移行性:**
   - 将来的にLibSQL（Turso）やPostgreSQLへ移行する際も、Drizzleの抽象化により最小限の修正で移行可能。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - 極めて高速なレスポンスと、AIが迷わないシンプルな型安全クエリが実現する。
- **トレードオフ・注意点 (Negative):**
  - `better-sqlite3` はNode.jsネイティブモジュールを使用するため、Next.jsのEdge Runtimeでは動作しない（通常のNode.js Server Components / Server Actionsで実行する必要がある）。
  - `sqlite.db` ファイル自体はGit管理から除外（`.gitignore` に追加）する。
```

&nbsp;

---

## 4\. データ永続化の仕様書（Spec 002）の作成

続いて、AIエージェントに実装させる2つ目の仕様書を作成します。 今回は「DBのセットアップ」「初期シードデータ」「Quick Captureの保存」「タスクの完了ステータス切り替え」までを一貫して定義します。

### File 2: `specs/active/002-local-db-and-quick-capture.md`

以下の内容でファイルを作成してください。

```markdown
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
```

&nbsp;

### 3.3 アーキテクチャ & 作成・変更予定ファイル

- `.gitignore` (変更: `sqlite.db`, `sqlite.db-*`, `drizzle/` 等を除外設定)  
- `drizzle.config.ts` (新規: Drizzle Kit 設定)  
- `src/db/schema.ts` (新規: テーブル定義)  
- `src/db/index.ts` (新規: DB接続インスタンスおよびテーブル初期化・初期シード処理)  
- `src/actions/dashboard-actions.ts` (新規: `"use server"` によるタスク更新・メモ追加の Server Actions)  
- `src/components/dashboard/PriorityTasksCard.tsx` (変更: DBデータの表示と完了トグル操作の組み込み)  
- `src/components/dashboard/QuickCaptureCard.tsx` (変更: フォーム送信と直近メモ3件の表示)  
- `src/app/page.tsx` (変更: Server ComponentとしてDBからデータを取得し各カードへ渡す)

## 4\. 検証手順 (Verification Steps)

1. `npx drizzle-kit push`（または初期化処理）でエラーなくテーブルが作成されること。  
2. `npm run lint` がエラーなしで通過すること。  
3. `npx tsc --noEmit` がエラーなしで通過すること。  
4. ブラウザ（`http://localhost:3000`）でクイックメモを入力・保存し、ページをリロードしてもメモが残っていること、およびタスクの完了状態を切り替えられること。

````

---

## 5. Antigravity への指示（プロンプト実行）

上記2つのファイル（ADR 0002 と Spec 002）を作成・保存したら、Antigravityのチャット欄に以下のプロンプトを入力して実行してください。

### 💬 エージェントへの指示プロンプト（コピペ用）

```text
@.antigravity/skills/implement-from-spec.md の手順に従い、
@docs/adr/0002-database-and-orm-selection.md の技術選定判断を踏まえた上で、
@specs/active/002-local-db-and-quick-capture.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
````

---

## 6\. 今回のポイント（レビュー時の着眼点）

エージェントから **Implementation Plan** が出力されたら、以下の点を確認してみてください（迷ったらまたチャットに貼り付けていただければ一緒に確認します！）。

1. **Server Component と Client Component の分離:**  
   * データの取得（SELECT）は `src/app/page.tsx` などの Server Component で行い、ボタンクリックやフォーム入力部分だけを最小限の Client Component（または Server Actions の `<form action={...}>`）にしているか。  
2. **テーブルの自動準備（DXへの配慮）:**  
   * `drizzle-kit push` を使うか、あるいは `better-sqlite3` 接続時に `CREATE TABLE IF NOT EXISTS` と初期シードを自動で走らせるか、扱いやすい方針を提案してくれているか。
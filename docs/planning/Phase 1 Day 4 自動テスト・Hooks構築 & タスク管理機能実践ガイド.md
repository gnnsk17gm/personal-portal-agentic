# Phase 1 / Day 4: Hooks（品質ガードレール）・自動テスト基盤の確立 & タスク管理画面の実装（Spec 003）

Day 1〜3で **`Rules`（憲法）** と **`Skills`（標準作業手順）** を構築し、DB永続化まで完了しました。 Day 4では、コンテキストエンジニアリングの3本柱の最後である **`Hooks`（自動検証フック）と単体テスト（Vitest）** を導入し、**「AIが書いたコードの品質を機械的に保証する仕組み（Self-Healing Loop）」** を完成させます。その上で、ポータルのメイン機能の一つである「タスク管理ページ（`/tasks`）」を実装します。

---

## 1\. Day 4 の到達目標（Definition of Done）

- [ ] Day 3 の仕様書（`002`）が `specs/completed/` に移動され、コミットされていること  
- [ ] テストフレームワーク（Vitest）の方針を記したスキル `.antigravity/skills/test-driven-verification.md` を作成する  
- [ ] コミット前やタスク完了時に品質を強制する `.antigravity/hooks/pre-commit-verify.sh`（およびGit Hook連携）を構築する  
- [ ] タスク管理ページ（`/tasks`）とService層テストの仕様書 `specs/active/003-tasks-page-and-unit-tests.md` を作成し、エージェントに実装・テスト実行まで完走させる

---

## 2\. なぜ「自動テスト × Hooks」が転職で最強のアピールになるのか？

面接官がAI駆動開発に対して抱く最大の懸念は **「AIが既存のロジックを壊したとき、どうやって検知するのか？」** です。

* **一般的な開発者:** 「画面をポチポチ触って確認しています」  
* **あなた（本プロジェクト）:** 「Service層に対するVitestの単体テストと、型チェック・Lint・Testを一括実行する検証スクリプト（Hooks）を組み込んでおり、AI自身がテストをパスするまで自己修復（Self-healing）するパイプラインを構築しています」

この仕組みを今日、リポジトリ内に実装します。

---

## 3\. コンテキストエンジニアリング：テスト検証スキルとHooksの定義

まず、エージェントに「Service層を作ったら必ず単体テストを書き、検証スクリプトを通す」という規律を与えます。

### File 1: `.antigravity/skills/test-driven-verification.md`

以下の内容でファイルを作成してください。

```markdown
# Skill: Test-Driven Verification (テスト駆動検証と品質ガードレール)

ビジネスロジック（`src/services/` 配下など）の新規作成・変更を行う際は、以下のテストおよび検証手順を必ず実行してください。

## 1. 単体テストの作成原則
- `src/services/` 内の関数には、対応するテストファイル（`src/services/__tests__/*.test.ts`）を作成・更新すること。
- テストランナーには **Vitest** を使用する。
- データベース操作を伴うテストでは、本番用の `sqlite.db` を汚染しないよう、インメモリDB（`:memory:`）またはテスト用の一時DBを使用する設計とすること。

## 2. 完了前の必須検証コマンド (Quality Gate)
実装完了を報告する前に、必ず `npm run verify`（Lint + TypeCheck + Vitest）を実行し、すべてのチェックが Green（成功）であることを確認すること。
```

&nbsp;

### File 2: `.antigravity/hooks/verify-all.sh`

エージェントやGitフックから共通で呼び出せる「品質検査スクリプト」を作成します。

```sh
#!/usr/bin/env bash
set -e

echo "🔍 [Hook: 1/3] Running ESLint..."
npm run lint

echo "📘 [Hook: 2/3] Running TypeScript Type Check..."
npx tsc --noEmit

echo "🧪 [Hook: 3/3] Running Vitest Unit Tests..."
npm run test:run

echo "✅ All quality checks passed!"
```

※作成後、ターミナルで実行権限を付与しておきます：

```sh
chmod +x .antigravity/hooks/verify-all.sh
```

---

## 4\. タスク管理ページ & 自動テスト導入の仕様書（Spec 003）

続いて、現在404になっているサイドバーの **「Tasks & Projects (`/tasks`)」ページ** を実装しつつ、**Vitestによる自動テスト環境と `npm run verify` パイプライン** を構築する仕様書を作成します。

### File 3: `specs/active/003-tasks-page-and-unit-tests.md`

以下の内容でファイルを作成してください。

```markdown
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
```

&nbsp;

---

## 5\. Antigravity への指示（プロンプト実行）

1. Day 3のコミットを済ませる  
2. 上記の3ファイル（`test-driven-verification.md`, `verify-all.sh`, `003-tasks-page-and-unit-tests.md`）を作成し、`chmod +x .antigravity/hooks/verify-all.sh` を実行する  
3. 以下のプロンプトをAntigravityに投げる

### 💬 エージェントへの指示プロンプト（コピペ用）

```
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@specs/active/003-tasks-page-and-unit-tests.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
```

&nbsp;
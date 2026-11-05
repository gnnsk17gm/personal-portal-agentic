# Spec 007: タスク駆動型ローカルRAGとナレッジ濃縮コンテキストの実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. `contextAssemblerService.ts` を拡張し、未完了の高優先度タスク（上位最大3件）のタイトルをクエリとして Second Brain（ノート）をBM25検索し、関連する知識スニペット（スコア閾値以上）を自動で抽出・紐付けるため。
  2. 組み立てられるAIコンテキスト（Markdown Payload）内に、単なるタスクリストだけでなく「各タスクの遂行に役立つ過去ノート（関連ナレッジ）」を構造化して埋め込み、AIの実行能力を最大化するため。
  3. ダッシュボードのタスク一覧およびブリーフィングにおいて、「どのタスクにどんなナレッジが自動紐付けされたか」を可視化するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0005-task-driven-local-rag.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [x] **タスクへのナレッジ紐付けロジック (`contextAssemblerService.ts`):**
  - 未完了の優先タスク（`priority === 'high'`、最大3件）それぞれについて、タイトルをクエリとして `searchService.searchNotes` を呼び出すこと。
  - スコアが一定基準（例: $Score > 0$）を満たす関連ノート（各タスク最大2件）を抽出し、タスク情報に関連付けられること。
- [x] **AI Context Payload の構造化拡張:**
  - 生成される Markdown Payload に、タスクと関連ノートを紐付けた形式（例: `### Priority Tasks with Relevant Knowledge`）が含まれること。
  - トークン予算（`maxChars`）の制限は引き続き厳守され、上限を超える場合は下位セクションから安全に切り詰められること。
- [x] **UIの可視化:**
  - ダッシュボードの `PriorityTasksCard` または `BriefingCard` において、関連ノートが存在するタスクに「📎 関連メモあり（または件数）」のバッジが表示されること。
  - 「AI Context Payload Preview」のMarkdown内で、タスクと関連知識が一体となってプレビューできること。
- [x] **単体テストと品質ゲート:**
  - `contextAssemblerService.test.ts` に「高優先度タスクに関連するノートが正しく抽出され、コンテキストペイロードに反映されること」を検証するテストケースが追加されること。
  - `npm run verify`（ESLint, TypeCheck, Vitest）がすべて Green であること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- なし（既存のゼロ依存アーキテクチャを維持）。

### 3.2 データ型の拡張 (`src/types/portal.ts`)
```typescript
import { RankedCapture } from './portal'; // 既存のRankedCapture等を活用

export interface EnrichedTask {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string | null;
  relevantNotes?: {
    id: number;
    content: string;
    score: number;
  }[];
}

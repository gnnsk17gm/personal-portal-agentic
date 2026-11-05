# Phase 2 / Day 3: タスク駆動型ローカルRAGパイプラインの完成（Spec 007 & ADR 0005）

Day 1で構築した **Dynamic Context Assembler（トークン予算制御）** と、Day 2で実装した **ローカルBM25検索エンジン**。 本日は、この2つを結合して **「タスクの内容に応じてSecond Brain（ノート）から関連知識を自動発掘し、AIプロンプト文脈を強化する『Task-Driven Local RAG（タスク駆動型検索拡張生成）』」** を完成させます。

---

## 1\. なぜ「タスク駆動型ローカルRAG」が転職で刺さるのか？

一般的なRAGの実装例は「ユーザーがチャットで質問し、類似ドキュメントを拾って回答する」という一問一答型にとどまります。 しかし、本プロジェクトで実装するのは、より一歩進んだ **「能動的・プロアクティブなコンテキスト注入」** です。

* **従来のポータル:** 「優先タスク：Next.jsのテスト修正」とだけ表示される。  
* **本日の進化（タスク駆動RAG）:**  
  * 高優先度タスクのタイトルからキーワードを自動抽出し、Second Brain内のノート群に対してBM25類似度検索を実行。  
  * 過去に書き留めた「Next.js 16のVitest環境構築ノウハウ」メモなどを自動で関連付け（スコアリング判定）。  
  * AIコンテキストペイロード内に **`### Relevant Knowledge for High-Priority Tasks`** セクションとして自動注入。  
  * UI上でも優先タスクカードに「📎 関連ナレッジ（スコア付）」として可視化。

これにより、面接官に対して **「外部API（OpenAI Embeddings等）に1円も課金せず、純粋なアルゴリズムと自作のコンテキスト制御によって、完全ローカルで動作する実用的なRAGパイプラインを組み上げた」** という圧倒的な技術力を証明できます。

---

## 2\. Phase 2 / Day 3 の到達目標（Definition of Done）

- [ ] タスク駆動RAGの設計思想を記した `docs/adr/0005-task-driven-local-rag.md` を作成する  
- [ ] RAG拡張の仕様書 `specs/active/007-task-driven-rag-enrichment.md` を作成する  
- [ ] Antigravity に Implementation Plan を出力させ、レビュー・承認する  
- [ ] `npm run verify`（全テストGreen）を維持したまま、タスクへのナレッジ自動紐付けとContext Assemblerの拡張を完了させる

---

## 3\. 意思決定の記録：ADR 0005 の作成

### File 1: `docs/adr/0005-task-driven-local-rag.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0005: タスク駆動型ローカルRAG（Task-Driven Retrieval-Augmented Generation）の採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-04
- **決定者:** Project Architect

## 1. コンテキスト (Context)
朝のブリーフィングやAIエージェントへの指示において、単純に「直近のノート5件」を渡すだけでは、現在注力すべき「高優先度タスク」を遂行するための知見が含まれていない可能性が高い。
エージェントがタスクを自律的に解決・支援できるようにするためには、タスクの題材に関連するナレッジ（Second Brain）を自動抽出し、プロンプト文脈へ関連度順に注入するRAG機構が必要である。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: ユーザーが手動でタスクとノートを関連付ける（リレーションテーブル）**
  - 実装は平易だが、ユーザーの手間が増え、「AIが自律的に状況を把握する」というポータルの思想に反する。
- **Option 2: 高優先度タスクのタイトルをクエリとしてBM25でオンザフライ検索し、関連ノートを自動抽出する**
  - DBスキーマの変更不要。タスクが作成された瞬間から、既存のSecond Brainノート群との関連度を自動計算してコンテキストへ統合できる。

## 3. 決定内容 (Decision)
**Option 2（BM25によるタスク駆動型オンザフライ検索・コンテキスト濃縮）を採用する。**

### 選定理由:
1. **プロアクティブなコンテキスト拡張 (Just-in-Time Context):**
   - 人間の明示的なリンク操作なしに、タスク名（例:「Drizzleのマイグレーション設定」）から過去の関連メモが自動でAIペイロードに浮上する。
2. **トークン予算（Token Budget）との調和:**
   - 無関係な直近メモを削り、BM25スコアの高い「タスクに関連するメモ」を優先的にプロンプト枠（`maxChars`）へ割り当てることで、コンテキストの品質密度を最大化する。
3. **完全ローカル・ゼロコストの維持:**
   - 外部Vector DBや課金APIを一切使わず、Pure TypeScriptのBM25サービスのみで完結する。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - タスク解決に必要なナレッジがAIプロンプトに自動付与され、将来のエージェント実行精度が飛躍的に向上する。
- **トレードオフ (Negative):**
  - 高優先度タスクごとに検索を走らせるため、タスク件数が多い場合に検索計算量が増加する（上位1〜3件の高優先度タスクのみを検索対象とすることで計算量を制限する）。
```

&nbsp;

---

## 4\. タスク駆動RAGの仕様書（Spec 007）の作成

### File 2: `specs/active/007-task-driven-rag-enrichment.md`

以下の内容でファイルを作成してください。

```markdown
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
- [ ] **タスクへのナレッジ紐付けロジック (`contextAssemblerService.ts`):**
  - 未完了の優先タスク（`priority === 'high'`、最大3件）それぞれについて、タイトルをクエリとして `searchService.searchNotes` を呼び出すこと。
  - スコアが一定基準（例: $Score > 0$）を満たす関連ノート（各タスク最大2件）を抽出し、タスク情報に関連付けられること。
- [ ] **AI Context Payload の構造化拡張:**
  - 生成される Markdown Payload に、タスクと関連ノートを紐付けた形式（例: `### Priority Tasks with Relevant Knowledge`）が含まれること。
  - トークン予算（`maxChars`）の制限は引き続き厳守され、上限を超える場合は下位セクションから安全に切り詰められること。
- [ ] **UIの可視化:**
  - ダッシュボードの `PriorityTasksCard` または `BriefingCard` において、関連ノートが存在するタスクに「📎 関連メモあり（または件数）」のバッジが表示されること。
  - 「AI Context Payload Preview」のMarkdown内で、タスクと関連知識が一体となってプレビューできること。
- [ ] **単体テストと品質ゲート:**
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
```

&nbsp;

### 3.3 作成・変更予定ファイル

- `src/types/portal.ts` (変更: `EnrichedTask` 等の型定義追加)  
- `src/services/contextAssemblerService.ts` (変更: 高優先度タスクに対するBM25検索・紐付け処理の統合)  
- `src/services/__tests__/contextAssemblerService.test.ts` (変更: タスク駆動RAGの単体テスト追加)  
- `src/components/dashboard/PriorityTasksCard.tsx` (変更: 関連ノートバッジの表示)  
- `src/components/dashboard/BriefingCard.tsx` (必要に応じた調整)

## 4\. 検証手順 (Verification Steps)

1. `npm run verify` がすべてエラーなしでパスすること。  
2. ブラウザで `/`（ダッシュボード）を開き、タスク「Next.jsのテスト実装」とメモ「Next.js 16のVitest環境構築メモ」が存在する場合、タスクに関連ノートが紐付き、AIプレビュー内に反映されることを確認。

````

---

## 5. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0005-task-driven-local-rag.md` と `specs/active/007-task-driven-rag-enrichment.md`）を作成・保存したら、Antigravity に以下の指示プロンプトを送信してください。

### 💬 エージェントへの指示プロンプト（コピペ用）

```text
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0005-task-driven-local-rag.md の設計判断を踏まえた上で、
@specs/active/007-task-driven-rag-enrichment.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
````

&nbsp;
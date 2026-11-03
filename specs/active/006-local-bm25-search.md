# Spec 006: ローカルBM25検索エンジンと Second Brain スコアリング表示の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. Second Brain（`/notes`）の検索を、単なる部分一致から「単語の重要度・出現頻度に基づいた関連度スコア順のランキング検索」へ進化させるため。
  2. 外部API課金（0円）を維持したまま、実用的なRAG（検索拡張生成）のコア技術である情報検索（Information Retrieval）アルゴリズムをポータル内に組み込むため。
- **参照すべきADR・スキル:**
  - `docs/adr/0004-local-retrieval-and-bm25.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **BM25 スコアリングサービス (`src/services/searchService.ts`):**
  - 入力されたクエリ文字列と対象ドキュメント群（ノート一覧）から、BM25アルゴリズムに基づきスコア（$Score \ge 0$）を計算し、降順（スコアの高い順）でソートして返すこと。
  - クエリが空の場合は、従来の作成日時降順（新しい順）で全件返すこと。
  - 英数字の単語単位および日本語の文字/Bi-gramに対応した軽量トークナイザーを含むこと。
- [ ] **Second Brain 画面 (`/notes`) のスコア表示:**
  - 検索バー（`?q=keyword`）で検索した際、従来の単純一致ではなく BM25 サービスを経由してソートされた結果が表示されること。
  - 検索結果の各カードに「関連度スコア（例: `Relevance: 2.45`）」バッジが表示されること（検索時のみ）。
  - マッチするノートが0件の場合のEmpty表示が適切に行われること。
- [ ] **単体テストと品質ゲート:**
  - `src/services/__tests__/searchService.test.ts` が作成され、クエリ一致スコアリング、複数単語クエリ時のIDF重み付け、空クエリ時の挙動などの単体テストがすべてパスすること。
  - `npm run verify` がすべて Green であること。

## 3. 技術設計 (Technical Design)
### 3.1 追加パッケージ
- なし（外部ライブラリを追加せず、TypeScript 標準の計算のみで実装）。

### 3.2 BM25 アルゴリズム仕様
ドキュメント $D$ とクエリ $Q = \{q_1, q_2, \dots, q_n\}$ に対するスコア式：
$$Score(D, Q) = \sum_{i=1}^n IDF(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$
- パラメータ標準値: $k_1 = 1.2$, $b = 0.75$
- $IDF(q_i) = \ln\left(\frac{N - n(q_i) + 0.5}{n(q_i) + 0.5} + 1\right)$ （負数防止の平滑化）
- 簡易トークナイズ: 英数字は空白/記号区切り、日本語はユニグラム（1文字）またはBi-gram（2文字連続）でトークン化して辞書引き。

### 3.3 作成・変更予定ファイル
- `src/services/searchService.ts` (新規: BM25 スコアリングおよびトークナイズ処理)
- `src/services/__tests__/searchService.test.ts` (新規: 検索アルゴリズムの単体テスト)
- `src/services/captureService.ts` (変更: 検索時に `searchNotes(query, db)` を呼び出しBM25でランク付け可能にする)
- `src/app/notes/page.tsx` (変更: BM25検索結果の受け取りとProps渡し)
- `src/components/notes/NoteList.tsx` (変更: スコア値が存在する場合のバッジ表示)

## 4. 検証手順 (Verification Steps)
1. `npm run verify`（ESLint + TypeScript + Vitest）がすべてエラーなしでパスすること。
2. ブラウザで `/notes?q=Next.js` 等の検索を行い、キーワードが多く含まれるメモや重要語が上位に並び、スコアバッジが表示されることを確認。

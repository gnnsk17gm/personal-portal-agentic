# Phase 2 / Day 2: 外部課金ゼロのローカル類似検索エンジン（Local RAG / BM25）の実装（Spec 006）

Day 1では、散在するタスク・予定・ノートをトークン予算内で動的にパッキングする **Dynamic Context Assembler** を完成させ、全39件のテストを通過させました。

Day 2では、Second Brain（`/notes`）の検索機能を「単純な文字列部分一致（`LIKE '%keyword%'`）」から、**「関連度スコアに基づくローカル類似度検索（BM25 / TF-IDFスコアリングアルゴリズム）」** へと進化させます。

これにより、外部の有料OpenAI Embeddings APIや外部Vector DB（Pinecone等）に1円も払うことなく、**「完全無料・ローカル完結で動くRAG（検索拡張生成）の基礎パイプライン」** をポータル内に構築します。

---

## 1\. Day 1 の完了確認と Git コミット（必須）

まずは手元のターミナルでブラウザ動作を確認し、Day 1 の成果をコミットしましょう。

### 動作確認ポイント

1. ブラウザで `http://localhost:3000` を開く。  
2. `BriefingCard` 内に未完了タスク数、本日の予定リストが表示されていることを確認する。  
3. 下部の `<details>` **「AI Context Payload Preview」** をクリックして展開し、整形されたMarkdownと推定トークン数（`~X tokens`）がリアルタイムに表示されることを確認する。

### アーカイブ & コミットコマンド

```sh
# Spec 005 を completed へ移動
mv specs/active/005-context-assembler-and-briefing.md specs/completed/

# コミット
git add .
git commit -m "feat(context): implement Dynamic Context Assembler with token budget and Morning Briefing (Spec 005)"
```

---

## 2\. なぜ「外部課金ゼロのローカル類似検索」が強い武器になるのか？

AI機能のポートフォリオでありがちなのが、「OpenAIのEmbedding APIを叩いてPineconeに保存しただけ」のラッパー実装です。これには以下の致命的な弱点があります：

1. **外部課金・APIキー依存:** 採用担当者やCI環境で動かそうとした際、APIキーがなければ動かない。  
2. **ブラックボックス化:** ライブラリを呼んでいるだけで、類似度計算や情報検索（IR: Information Retrieval）の仕組みを本人が理解しているか伝わらない。

本プロジェクトでは、業界標準の情報検索アルゴリズムである **BM25（Best Matching 25）** を純粋なTypeScriptでローカルサービスとして実装します。

* **外部通信ゼロ・APIキー不要・従量課金ゼロ（完全0円）**  
* メモの重要度（単語出現頻度 TF × 逆文書頻度 IDF）を数式通りにスコアリングし、関連度の高い順にノートをソートして返却  
* Vitestによる100%決定論的なテストが可能

この設計判断を **ADR 0004** と **Spec 006** に落とし込みます。

---

## 3\. 意思決定の記録：ADR 0004 の作成

### File 1: `docs/adr/0004-local-retrieval-and-bm25.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0004: 外部API非依存のローカル情報検索（BM25アルゴリズム）の採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-03
- **決定者:** Project Architect

## 1. コンテキスト (Context)
Second Brain（`/notes`）に蓄積された知識メモから、ユーザーの関心やタスクに関連する情報を取得（Retrieval）する仕組みが必要である。
従来の `LIKE '%q%'` 検索では単純な部分一致しか拾えず、関連度に応じた順位付け（Relevance Ranking）ができない。一方、商用クラウドのVector Embeddings API（OpenAI等）を導入すると、外部課金が発生し、APIキーがない環境での再現性・テスト容易性が損なわれる。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: OpenAI Embeddings API + pgvector / Chroma**
  - 高度な意味検索が可能だが、外部課金が発生し、ローカル起動のオーバーヘッドが大きい。
- **Option 2: SQLite 標準の LIKE 検索のみを継続**
  - コストゼロだが、スコアリング（重要度順の並べ替え）ができず、RAGとしての品質が低い。
- **Option 3: Pure TypeScript による BM25 スコアリングエンジンの内製実装**
  - 外部依存ライブラリや課金APIを一切使わず、古典的かつ高精度な検索アルゴリズム（BM25）をService層に組み込む。

## 3. 決定内容 (Decision)
**Option 3（Pure TypeScript による BM25 スコアリングエンジン）を採用する。**

### 選定理由:
1. **完全無料・ゼロコンフィグのローカル再現性:**
   - 外部APIキーや重厚なC++ネイティブバインディングを必要とせず、Node.js環境だけで高速にスコアリングが完結する。
2. **情報検索（IR）アルゴリズムの深い理解の証明:**
   - 単なるAPIラッパーではなく、情報検索の基礎数式（TF-IDF / BM25）を自らモデル化・テストしている点が、採用市場において強い差別化要素となる。
3. **ハイブリッド検索への拡張性:**
   - 将来的にベクトル埋め込み（Dense Retrieval）を導入する際も、このBM25（Sparse Retrieval）と組み合わせたハイブリッド検索（Reciprocal Rank Fusion）へシームレスに発展できる。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - 100%決定論的な単体テストが可能。
  - 検索クエリに対して「なぜこのメモが上位に来たのか（スコア）」をUIに可視化できる。
- **トレードオフ (Negative):**
  - 日本語の高度な形態素解析（形態素辞書）を導入しない場合、N-gramや簡易トークナイズ（文字・単語境界）による近似となる。
```

&nbsp;

---

## 4\. ローカル類似検索の仕様書（Spec 006）

### File 2: `specs/active/006-local-bm25-search.md`

以下の内容でファイルを作成してください。

```markdown
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
```

&nbsp;

---

## 5\. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0004-local-retrieval-and-bm25.md` と `specs/active/006-local-bm25-search.md`）を作成したら、Antigravityに以下のプロンプトを投げてください。

### 💬 エージェントへの指示プロンプト（コピペ用）

```
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0004-local-retrieval-and-bm25.md の設計判断を踏まえた上で、
@specs/active/006-local-bm25-search.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
```

&nbsp;
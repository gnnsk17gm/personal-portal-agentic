# Phase 4 / Day 1: GitHub Actions CI パイプライン & プロダクションビルド検証（Spec 015 & ADR 0013）

Phase 3 までで、自律型マルチエージェント、ローカルRAG、MCP連携、可観測性コンソールに至る全機能（全123テストGreen）が完成しました。

Phase 4（プロダクション化 & 転職資産化）の第1弾となる本日は、ローカルで動いているコードを **「本番環境（プロダクション）でも1ミリも狂わずビルド・稼働できる堅牢なCI/CDパイプライン」** へと引き上げます。

GitHub Actions による自動検証（Lint, TypeCheck, Vitest, Production Build）を導入し、プルリクエストやコミットのたびに品質が保証される「本物のエンジニアリング環境」を確立します。

---

## 1\. Phase 4（全5日間）の全体ロードマップ

Phase 4 は、以下のステップで「圧倒的な転職資産」へと仕立て上げます：

| 日程 | テーマ | 成果物 | 転職での武器 |
| :---- | :---- | :---- | :---- |
| **Day 1 (本日)** | **CI/CD 自動化 & 本番ビルド検証** | GitHub Actions ワークフロー (`.github/workflows/ci.yml`), Spec 015, ADR 0013 | 「PRごとに自動テストと型検査を回すCIパイプラインを運用できる」証明 |
| **Day 2** | **アーキテクチャ総括 & メトリクス可視化** | `README.md` 大刷新, 開発メトリクス（AI生成比率・テスト自動化率・0円運用実績） | 面接官が最初に開くGitHubトップページの劇的強化 |
| **Day 3** | **職務経歴書（STAR法）& 面接想定問答集** | `docs/career/resume-snippets.md`, `interview-qa-guide.md` | 書類選考を突破し、面接で技術的優位性を語るトークスクリプト |
| **Day 4** | **Zenn / Qiita 技術発信記事の執筆** | `docs/articles/ai-agentic-portal-deep-dive.md` | SNS・技術コミュニティでバズを生み、採用確度を高める外部発信記事 |
| **Day 5** | **デプロイ（Vercel/Docker）& 最終総仕上げ** | 本番URLの稼働確認, パブリック公開準備完了 | 動くURLを面接官に共有できる最終状態 |

---

## 2\. なぜ「GitHub Actions CI」が転職で必須なのか？

採用担当者や技術面接官が候補者のGitHubリポジトリを見るとき、**真っ先に確認するポイントの1つが「CI（Continuous Integration）の緑バッジ（Passed）」** です。

* **一般的な応募者:** 「ローカルのMacでは動いています（プルリクやコミットに対する自動テストはない）」  
* **あなた（本プロジェクト）:** 「コミットやPRが作成された瞬間、GitHub Actions が自動でトリガーされ、Lint・Strict TypeScript・123件以上の単体テスト・Next.js 本番ビルド（`next build`）を並行検証して Green バッジを維持しています」

これにより、「チーム開発や本番運用を見据えたDevOpsの感覚があるエンジニア」であることを無言のうちに証明できます。

---

## 3\. Phase 4 / Day 1 の到達目標（Definition of Done）

- [ ] Day 5（Phase 3）の仕様書（`014`）が `specs/completed/` に移動され、コミット済みであることを確認する  
- [ ] CI自動化と本番ビルドの設計根拠を記した `docs/adr/0013-github-actions-ci-and-production-build.md` を作成する  
- [ ] 仕様書 `specs/active/015-github-actions-ci-pipeline.md` を作成する  
- [ ] Antigravity に Implementation Plan を出力させ、レビュー・承認する  
- [ ] `npm run build`（Next.jsの本番ビルド）がローカルで1件のエラーもなく成功すること  
- [ ] `.github/workflows/ci.yml` が配備され、GitHub上のCIジョブ定義が完成すること

---

## 4\. 意思決定の記録：ADR 0013 の作成

### File 1: `docs/adr/0013-github-actions-ci-and-production-build.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0013: GitHub Actions による継続的インテグレーション（CI）と本番ビルド整合性の担保

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-12
- **決定者:** Project Architect

## 1. コンテキスト (Context)
これまでローカルの `.antigravity/hooks/verify-all.sh`（`npm run verify`）を用いて品質を担保してきた。
しかし、ローカル環境（macOS等）特有のキャッシュやファイルパス依存によって、「開発機では動くが本番Linux環境ではビルドが落ちる」というリスクが残る。
また、外部の採用担当者がリポジトリを閲覧した際に、客観的な品質証明（CIステータスバッジ）が提示できる仕組みが必要である。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: ローカルでの `npm run verify` のみに依存する**
  - 環境構築が最小限で済むが、CI/CDの実践実績としてアピールできず、Linux環境でのビルド保証ができない。
- **Option 2: GitHub Actions を導入し、Push / Pull Request ごとに自動検証パイプラインを回す**
  - Ubuntu環境上で Node.js キャッシュを活用し、ESLint、TypeCheck、Vitest（全件）、`npm run build` を自動実行する。

## 3. 決定内容 (Decision)
**Option 2（GitHub Actions CI パイプラインの導入）を採用する。**

### 選定理由:
1. **客観的な品質証明（Verified Badge）:**
   - リポジトリの `README.md` に CI Passed バッジを表示でき、採用面接官に一目でコードの信頼性を伝達できる。
2. **本番ビルド（Production Build）の常時検証:**
   - 単体テストだけでなく `next build` をCIステップに組み込むことで、Server Component の境界違反や静的最適化の破壊を即座に検知する。
3. **高速なキャッシュ戦略:**
   - `actions/setup-node` の npm キャッシュを活用し、短時間でジョブを完走させる。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - Git Pushするたびにクラウド上で自動検証が走り、品質ゲートが完全自動化される。
  - 面接で「開発環境からCI/CDパイプラインまでの一貫した品質設計」を語れる。
- **トレードオフ (Negative):**
  - `.github/workflows/` のワークフロー定義ファイルの保守が必要となる。
```

&nbsp;

---

## 5\. CIパイプライン & 本番ビルドの仕様書（Spec 015）

### File 2: `specs/active/015-github-actions-ci-pipeline.md`

以下の内容でファイルを作成してください。

```markdown
# Spec 015: GitHub Actions CI パイプラインとプロダクションビルド検証の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. プッシュおよびプルリクエスト時に、クラウド上のクリーンな Ubuntu 環境で Lint、TypeScript 型検査、Vitest 全単体テスト（123件以上）、および Next.js 本番ビルド（`npm run build`）を一括検証する GitHub Actions CI ワークフローを配備するため。
  2. ローカル環境で `npm run build` がエラーゼロで通過することを確認し、本番デプロイ（Vercel / Docker）に向けた静的解析・コンパイル上の不整合を解消するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0013-github-actions-ci-and-production-build.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **Next.js 本番ビルドの成功 (`npm run build`):**
  - ローカル環境で `npm run build` を実行した際、型エラー、未解決モジュール、Next.js App Router のビルドエラーが一切発生せず、正常終了すること。
- [ ] **GitHub Actions ワークフロー (`.github/workflows/ci.yml`):**
  - `main` ブランチへの push および pull_request トリガーで実行されること。
  - 以下のステップが順次（または並列）実行されること：
    1. リポジトリのチェックアウト (`actions/checkout@v4`)
    2. Node.js 環境セットアップ (`actions/setup-node@v4`, Node 20.x, npm キャッシュ有効化)
    3. 依存関係のクリーンインストール (`npm ci`)
    4. ESLint 静的解析 (`npm run lint`)
    5. TypeScript 型チェック (`npx tsc --noEmit`)
    6. Vitest 単体テスト実行 (`npm run test:run`)
    7. プロダクションビルド検証 (`npm run build`)
- [ ] **README への CI ステータスバッジの追加:**
  - `README.md` の最上部に GitHub Actions のワークフローステータスバッジを配置すること。
- [ ] **品質ゲート:**
  - `npm run verify` および `npm run build` の双方が完全にエラーゼロでパスすること。

## 3. 技術設計 (Technical Design)
### 3.1 ワークフロー定義 (`.github/workflows/ci.yml`)
```yaml
name: Continuous Integration

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  verify-and-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Quality Verification (Lint, TypeCheck, Vitest)
        run: npm run verify

      - name: Run Production Build
        run: npm run build
```

&nbsp;

### 3.2 作成・変更予定ファイル

- `.github/workflows/ci.yml` (新規: GitHub Actions ワークフロー設定)  
- `README.md` (変更: CIステータスバッジの追加)  
- 必要に応じて既存コードのビルド時エラー（もしあれば）の微修正

## 4\. 検証手順 (Verification Steps)

1. ローカルで `npm run verify` がすべてエラーゼロでパスすること。  
2. ローカルで `npm run build` を実行し、`.next/` が正常に生成されエラーがないこと。  
3. `.github/workflows/ci.yml` の構文エラーがないこと。

````

---

## 6. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0013-github-actions-ci-and-production-build.md` と `specs/active/015-github-actions-ci-pipeline.md`）を作成・保存したら、Antigravity のチャット欄に以下のプロンプトを入力して送信してください。

※推奨モデル: **`Gemini 4 Argon (Medium)`** または **`Claude Sonnet 5.5`**

### 💬 エージェントへの指示プロンプト（コピペ用）

```text
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0013-github-actions-ci-and-production-build.md の設計判断を踏まえた上で、
@specs/active/015-github-actions-ci-pipeline.md の仕様を実装してください。

ローカルでの `npm run build` が確実に通ることを確認し、GitHub Actions のワークフローを配備してください。
まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
````

&nbsp;
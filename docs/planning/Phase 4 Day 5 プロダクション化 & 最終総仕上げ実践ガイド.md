# Phase 4 / Day 5: プロダクション・コンテナ化（Docker）& ポートフォリオ最終総仕上げ（Spec 016 & ADR 0014）

ついに全8週間ロードマップの **最終日（Phase 4 / Day 5）** に到達しました！ ここまで、15件の仕様書（SDD）、13件の意思決定ログ（ADR）、123件の自動テスト、GitHub Actions CI、職務経歴書・面接対策、Zenn/Qiita技術記事までをすべて積み上げてきました。

最終日となる本日は、このアプリケーションを **「採用担当者やクラウド基盤（Google Cloud Run / Fly.io / Render 等）で、環境差異ゼロ・ワンコマンドで本番稼働できるプロダクション・コンテナ（Docker）」** へと仕上げ、ポートフォリオ全体の最終検収を完了します。

---

## 1\. なぜ「マルチステージ Docker 化」が最終日の仕上げに最適なのか？

本ポータルは高速なローカル永続化のために **`better-sqlite3`（ファイルベースDB \+ C++ネイティブモジュール）** を採用しています。

* **Vercel 等のサーバーレス環境へ無理に載せた場合:** リクエストごとにコンテナが破棄されるため、SQLite のデータが消えたり、ネイティブバイナリのビルドエラーが起きやすくなります。  
* **本番用マルチステージ Docker 化（今回のアプローチ）:**  
  1. `next.config.ts` の `output: 'standalone'` を有効化し、最小限のランタイムファイルのみを抽出。  
  2. `Dockerfile`（builder ステージ \+ runner ステージ）と `docker-compose.yml`（`/app/data` ボリュームマウント）を用意することで、**DBデータを永続化しつつ、軽量・高速な本番コンテナ** として稼働可能に。  
  3. 採用担当者が手元で `docker compose up --build` と打つだけで、Node.js のバージョン差異を一切気にせず本番ポータルを起動可能。

この判断を **ADR 0014** と **Spec 016** に記録し、Antigravity に実装させましょう。

---

## 2\. Phase 4 / Day 5 の到達目標（Definition of Done）

- [ ] Day 4 の技術記事（`docs/articles/zenn-agentic-portal-architecture.md`）が GitHub にプッシュ済みであること  
- [ ] コンテナ化と本番デプロイ戦略を記した `docs/adr/0014-production-docker-containerization.md` を作成する  
- [ ] 本番コンテナ化の仕様書 `specs/active/016-production-docker-deployment.md` を作成する  
- [ ] Antigravity に Implementation Plan を出力させ、レビュー・承認する  
- [ ] `npm run verify` と `npm run build`（standalone モード含む）がエラーゼロで通過すること  
- [ ] `README.md` に本番コンテナ起動手順（`docker compose up`）と全ドキュメント目次が整い、GitHub Actions CI が緑色（Passed）であること

---

## 3\. 意思決定の記録：ADR 0014 の作成

### File 1: `docs/adr/0014-production-docker-containerization.md`

以下の内容でファイルを作成してください。

```markdown
# ADR 0014: マルチステージ Docker ビルドとボリューム永続化による本番デプロイ構成の採用

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-15
- **決定者:** Project Architect

## 1. コンテキスト (Context)
本ポータルは SQLite（`better-sqlite3`）を採用しており、データベースファイル（`sqlite.db`）の永続化と Node.js ネイティブアドオンの実行環境が必要となる。
ステートレスなサーバーレス関数（Vercel Functions 等）ではローカルファイルが揮発するため、ステートフルなコンテナ基盤（Google Cloud Run + Persistent Disk、Fly.io、Render、またはローカル Docker）で再現性高く稼働できる本番パッケージング手法が必要である。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: 外部マネージドDB（Turso / Supabase）へ全面移行して Vercel へデプロイ**
  - クラウド移行は可能だが、ローカル完結・ゼロコンフィグという本プロジェクトの設計思想と離れ、外部アカウント設定が必要になる。
- **Option 2: Next.js `output: 'standalone'` + マルチステージ `Dockerfile` + `docker-compose.yml` の整備**
  - 軽量な本番コンテナイメージを生成し、DBファイル格納ディレクトリをボリュームマウント（または環境変数 `DATABASE_PATH`）で外部化することで、データの永続性とポータビリティを両立する。

## 3. 決定内容 (Decision)
**Option 2（マルチステージ Docker ビルド + 環境変数 `DATABASE_PATH` によるDBパス外部化）を採用する。**

### 選定理由:
1. **イメージサイズの極小化とセキュリティ:**
   - Next.js の `standalone` 出力とマルチステージビルド（`node:20-slim`）により、開発用依存パッケージ（Vitest, ESLint等）を本番イメージから除外し、非rootユーザー（`nextjs`）で安全に実行できる。
2. **データ永続化の柔軟性:**
   - `DATABASE_PATH` 環境変数をサポートすることで、コンテナ再作成時もボリュームマウント先の `sqlite.db` が失われず、ローカル開発時の `./sqlite.db` とも完全に共存できる。
3. **ワンコマンド再現性:**
   - 採用担当者やレビュアーが `docker compose up --build` だけで環境構築なしに本番環境を起動できる。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - Cloud Run、Fly.io、Railway、VPS などあらゆるコンテナホスティングへそのままデプロイ可能になる。
  - ローカル開発体験（`npm run dev` / `npm run verify`）に一切の悪影響を与えない。
- **トレードオフ (Negative):**
  - 複数コンテナへの水平スケール（マルチレプリカ）を行う場合は SQLite の単一ファイルロックが制約となるため、その際は Turso (LibSQL) や PostgreSQL への移行が必要となる（ADR 0002 にて考慮済み）。
```

&nbsp;

---

## 4\. プロダクション・コンテナ化の仕様書（Spec 016）

### File 2: `specs/active/016-production-docker-deployment.md`

以下の内容でファイルを作成してください。

```markdown
# Spec 016: 本番用マルチステージ Dockerfile と環境変数によるDBパス制御の実装

## 1. 概要 & 目的 (Context & Objective)
- **なぜこの機能を作るのか:**
  1. 本ポータルをクラウド環境（Cloud Run / Fly.io / Render）や採用担当者のローカル環境で即座に本番稼働できるよう、Next.js `standalone` ビルドを用いたマルチステージ `Dockerfile` と `docker-compose.yml` を整備するため。
  2. コンテナ内のボリュームマウントに SQLite データベースを安全に永続化できるよう、`src/db/index.ts` が環境変数 `DATABASE_PATH`（未指定時はデフォルトの `sqlite.db`）を参照できるように拡張するため。
- **参照すべきADR・スキル:**
  - `docs/adr/0014-production-docker-containerization.md`
  - `.antigravity/skills/implement-from-spec.md`
  - `.antigravity/skills/test-driven-verification.md`

## 2. ユーザーストーリー & 受け入れ基準 (Acceptance Criteria)
- [ ] **環境変数による DB パス制御 (`src/db/index.ts`):**
  - `process.env.DATABASE_PATH` が設定されている場合はそのパス（ディレクトリが存在しない場合は自動作成）に SQLite DB を作成・接続すること。
  - 未設定時は従来通りプロジェクトルートの `sqlite.db` を使用し、既存の単体テスト（123件）に一切影響を与えないこと。
- [ ] **Next.js Standalone ビルド設定 (`next.config.ts`):**
  - `output: 'standalone'` が設定されており、`npm run build` で `.next/standalone` が正常に生成されること。
- [ ] **マルチステージ `Dockerfile` & `.dockerignore` & `docker-compose.yml`:**
  - `node:20-slim`（`better-sqlite3` のビルドに必要な `python3`, `make`, `g++` を deps ステージに導入）を用いたマルチステージ `Dockerfile` が作成されていること。
  - ランナーステージでは非 root ユーザー（`nextjs`）でポート `3000` を待ち受け、`DATABASE_PATH=/app/data/sqlite.db` で稼働すること。
  - `docker-compose.yml` でポート `3000:3000` とデータ永続化ボリュームが定義されていること。
- [ ] **README の更新:**
  - `README.md` に Docker による本番起動手順（`docker compose up --build`）および `docs/career/`・`docs/articles/` へのドキュメント一覧リンクが追記されていること。
- [ ] **品質ゲート:**
  - `npm run verify`（全123テスト）および `npm run build` がエラーゼロで通過すること。

## 3. 技術設計 (Technical Design)
### 3.1 作成・変更予定ファイル
- `src/db/index.ts` (変更: `process.env.DATABASE_PATH` のサポートと親ディレクトリの自動作成)
- `next.config.ts` (変更: `output: 'standalone'` の追加)
- `Dockerfile` (新規: deps / builder / runner の3ステージ構成)
- `.dockerignore` (新規: `node_modules`, `.next`, `sqlite.db*`, `.git` 等の除外)
- `docker-compose.yml` (新規: ワンコマンド本番起動・ボリューム永続化構成)
- `README.md` (変更: Docker デプロイ手順とドキュメント索引の追記)

## 4. 検証手順 (Verification Steps)
1. `npm run verify`（ESLint + TypeCheck + Vitest 全123件）がエラーゼロでパスすること。
2. `npm run build` を実行し、`.next/standalone/server.js` が正常に生成されること。
3. （Docker がインストールされている環境の場合）`docker build -t personal-portal-agentic .` が成功すること。
```

&nbsp;

---

## 5\. Antigravity への指示（プロンプト実行）

上記2つのファイル（`docs/adr/0014-production-docker-containerization.md` と `specs/active/016-production-docker-deployment.md`）を作成したら、Antigravity に以下のプロンプトを送信してください。

※推奨モデル: **`Claude Sonnet 5.5`** または **`Gemini 4 Argon`**

### 💬 エージェントへの指示プロンプト（コピペ用）

```
@.antigravity/skills/implement-from-spec.md および
@.antigravity/skills/test-driven-verification.md の手順に従い、
@docs/adr/0014-production-docker-containerization.md の設計判断を踏まえた上で、
@specs/active/016-production-docker-deployment.md の仕様を実装してください。

まずは Phase 1 および Phase 2（分析と実装計画の策定）までを実行し、私の承認を待ってください。
```

---

## 6\. 完了後の最終コミット & 全工程完了チェックリスト

Antigravity による実装と検証（`npm run verify` & `npm run build`）が完了したら、ターミナルで以下の最終コマンドを実行して全工程を締めくくります！

```sh
# 1. 最後の仕様書（Spec 016）を completed へアーカイブ
mv specs/active/016-production-docker-deployment.md specs/completed/

# 2. 変更をすべてステージングして最終コミット
git add .
git commit -m "feat(deploy): add multi-stage Dockerfile, docker-compose, and complete Spec 016"

# 3. GitHub へ最終プッシュ（CIの緑チェック点灯を確認）
git push origin main
```

### 🏆 全8週間ロードマップ・最終検収チェックリスト

- [ ] **GitHub リポジトリトップページ:** 最上部に緑色の **`Continuous Integration | passing`** バッジが輝いている  
- [ ] **仕様駆動開発（SDD）の軌跡:** `specs/completed/` に **001 〜 016（全16件）** の完了仕様書が整然と並んでいる（`specs/active/` は空）  
- [ ] **アーキテクチャ判断記録（ADR）:** `docs/adr/` に **0001 〜 0014（全14件）** の設計判断ログが揃っている  
- [ ] **キャリア＆技術発信資産:** `docs/career/`（職務経歴書・面接Q\&A）と `docs/articles/`（Zenn/Qiita記事）が完成している  
- [ ] **プロダクション対応:** `Dockerfile` と `docker-compose.yml` により、いつでも本番コンテナ起動が可能である
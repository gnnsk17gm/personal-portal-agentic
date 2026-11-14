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

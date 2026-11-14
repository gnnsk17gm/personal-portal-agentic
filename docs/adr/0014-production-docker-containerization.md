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

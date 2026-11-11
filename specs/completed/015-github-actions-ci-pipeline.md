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

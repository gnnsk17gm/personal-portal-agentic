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

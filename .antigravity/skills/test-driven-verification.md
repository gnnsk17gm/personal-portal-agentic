# Skill: Test-Driven Verification (テスト駆動検証と品質ガードレール)

ビジネスロジック（`src/services/` 配下など）の新規作成・変更を行う際は、以下のテストおよび検証手順を必ず実行してください。

## 1. 単体テストの作成原則
- `src/services/` 内の関数には、対応するテストファイル（`src/services/__tests__/*.test.ts`）を作成・更新すること。
- テストランナーには **Vitest** を使用する。
- データベース操作を伴うテストでは、本番用の `sqlite.db` を汚染しないよう、インメモリDB（`:memory:`）またはテスト用の一時DBを使用する設計とすること。

## 2. 完了前の必須検証コマンド (Quality Gate)
実装完了を報告する前に、必ず `npm run verify`（Lint + TypeCheck + Vitest）を実行し、すべてのチェックが Green（成功）であることを確認すること。
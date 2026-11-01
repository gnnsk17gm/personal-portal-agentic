# Skill: Implement Feature from Specification (仕様書からの機能実装手順)

人間から特定の仕様書（`specs/active/xxx.md`）の実装を指示された場合、以下の4フェーズを順番に実行してください。**フェーズを飛び越えていきなりコードを書いてはいけません。**

## Phase 1: 仕様の読み込みと分析 (Analysis)
1. 指定された `specs/active/` 内の仕様書と、`.antigravity/rules/` 内の全ルールを読み込む。
2. 既存のディレクトリ構造や関連ファイルを確認する。
3. 仕様に曖昧な点や技術的矛盾がある場合は、この時点で人間に質問する。

## Phase 2: 実装計画の策定と承認待ち (Planning)
コードを編集する前に、以下の構成で **Implementation Plan（実装計画）** をチャットに出力し、人間の承認（Approval）を求めること。
- **新規作成するファイル一覧**（パスと役割）
- **変更する既存ファイル一覧**（パスと変更内容）
- **追加パッケージの有無**（原則として無断追加は禁止、必要な場合は理由を明記）
- **実装ステップの順序**

> ⚠️ **STOP:** 人間から「承認します（Approved / LGTM / 進めてください）」の返答があるまで、Phase 3 には進まないこと。

## Phase 3: 実装の実行 (Execution)
承認された計画に従い、ファイルを順次作成・編集する。
- `.antigravity/rules/10-technical-standards.md` の規約（ライトモード基調、TypeScript Strict、Server Component優先など）を厳守すること。

## Phase 4: 自己検証と完了報告 (Verification)
実装後、人間に完了報告をする前に以下のコマンドをターミナルで実行し、エラーがないことを確認する。
1. `npm run lint`
2. `npx tsc --noEmit` (型チェック)
3. エラーが出た場合は自律的に修正し、すべてパスした状態で人間に変更サマリーを報告する。

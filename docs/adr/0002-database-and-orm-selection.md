# ADR 0002: ローカルファーストDBおよびORMの選定 (SQLite + Drizzle ORM)

- **ステータス:** Accepted (採択)
- **決定日:** 2026-11-01
- **決定者:** Project Architect

## 1. コンテキスト (Context)
パーソナルポータルにおいて、タスク（Tasks）やクイックメモ（Notes/Captures）を永続化する必要がある。
個人用コマンドセンターとして高速に動作し、ローカル開発環境で外部コンテナ（Docker等）を立ち上げなくても即座に稼働でき、かつ将来的にクラウドDB（Turso / PostgreSQL等）へ移行しやすい構成が求められる。また、AIエージェントがスキーマ定義とクエリを正確に記述できる型安全性が必須である。

## 2. 検討した選択肢 (Options Considered)
- **Option 1: SQLite (`better-sqlite3`) + Drizzle ORM**
  - TypeScriptのみでスキーマを定義でき、SQLライクで軽量・高速。
- **Option 2: SQLite + Prisma**
  - 独自スキーマ言語（`.prisma`）とRustエンジンを使用。学習データは多いが、`prisma generate` の再実行忘れによるAIエージェントの型エラーが起きやすい。
- **Option 3: Docker PostgreSQL + Drizzle ORM**
  - 本番環境に近いが、ローカル起動の手間が増え、初期フェーズのイテレーション速度が落ちる。

## 3. 決定内容 (Decision)
**Option 1（SQLite `better-sqlite3` + Drizzle ORM）を採用する。**

### 選定理由:
1. **AIエージェントとの親和性（Pure TypeScript Schema）:**
   - Drizzleはスキーマ定義自体がTypeScriptファイル（`src/db/schema.ts`）であるため、Prismaのようにコード生成コマンド（`prisma generate`）を挟まずとも即座にTypeScriptの型推論が効く。これによりAIエージェントの実装ループが高速かつ正確になる。
2. **ゼロコンフィグのローカル実行:**
   - 単一ファイル（`sqlite.db`）で動作するため、環境構築の依存関係が最小化される。
3. **移行性:**
   - 将来的にLibSQL（Turso）やPostgreSQLへ移行する際も、Drizzleの抽象化により最小限の修正で移行可能。

## 4. 結果とトレードオフ (Consequences)
- **メリット (Positive):**
  - 極めて高速なレスポンスと、AIが迷わないシンプルな型安全クエリが実現する。
- **トレードオフ・注意点 (Negative):**
  - `better-sqlite3` はNode.jsネイティブモジュールを使用するため、Next.jsのEdge Runtimeでは動作しない（通常のNode.js Server Components / Server Actionsで実行する必要がある）。
  - `sqlite.db` ファイル自体はGit管理から除外（`.gitignore` に追加）する。

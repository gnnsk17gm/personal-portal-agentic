# ADR 0018: 家計簿モジュール（Finance）および固定費スナップショット自動計上設計

- **ステータス:** Accepted
- **日付:** 2026-11-23
- **関連 Spec:** `specs/active/021-finance-tracker.md`

---

## 1. コンテキストと課題

自宅普段使い用パーソナルポータルにおいて、日々の支出・収入の記録、月間総予算の管理、および毎月の固定費・サブスクリプション管理を行う家計簿機能（`/finance`）を追加する。

設計上の主要な課題は以下の 3 点である：

1. **計上漏れ防止と例外調整の両立:** 家賃やサブスクリプションなどの固定費は毎月手動登録する手間を省きたいが、特定月だけ金額が変わったり、後から個別修正したりする柔軟性も必要である。
2. **過去の履歴不変性（スナップショット保証）:** 固定費マスタの金額やカテゴリを改定した際、過去月や既に計上済みの当月明細の金額が遡って書き換わってはならない。
3. **解約・停止時の挙動:** サブスクリプションを解約した際、過去の支出履歴は残したまま、翌月以降の自動計上のみを確実に停止できる必要がある。

---

## 2. 決定事項

### 2.1 データベーススキーマ設計（SQLite + Drizzle ORM）

既存の SQLite データベースに以下の 4 テーブルを追加する（Drizzle マイグレーション経由で適用し、接続時に `PRAGMA foreign_keys = ON` を有効化する）。外部有料 API への依存は一切持たず、すべてローカルで完結させる。

1. **`finance_transactions`（収支明細テーブル）**
   - `id`: `integer` (PK, autoIncrement)
   - `type`: `text` (`'expense' | 'income'`, NOT NULL)
   - `amount`: `integer` (NOT NULL, 正の整数・円単位)
   - `category`: `text` (NOT NULL)
   - `date`: `text` (NOT NULL, `YYYY-MM-DD` 形式)
   - `note`: `text` (NOT NULL, デフォルト `''`)
   - `recurringId`: `integer` (NULLABLE, `recurring_expenses.id` への外部キー。`ON DELETE SET NULL`)
   - `billingMonth`: `text` (NULLABLE, 自動計上時の対象年月 `YYYY-MM`。手動登録時は `NULL`)
   - `createdAt`: `text` (NOT NULL, ISO 8601)
   - **ユニーク制約:** `(recurringId, billingMonth)` に部分ユニークインデックス（`recurringId IS NOT NULL`）を設け、同一固定費の同一月への二重計上を DB レベルで防止する。

2. **`recurring_expenses`（固定費マスタテーブル）**
   - `id`: `integer` (PK, autoIncrement)
   - `title`: `text` (NOT NULL, 例: `家賃`, `動画サブスク`)
   - `amount`: `integer` (NOT NULL, 正の整数・円単位)
   - `category`: `text` (NOT NULL)
   - `dayOfMonth`: `integer` (NOT NULL, `1`〜`28` の計上日。月末ズレ防止のため上限を 28 日とする)
   - `isActive`: `integer` (boolean mode, NOT NULL, デフォルト `true`)
   - `createdAt`: `text` (NOT NULL, ISO 8601)
   - `updatedAt`: `text` (NOT NULL, ISO 8601)

3. **`recurring_generations`（固定費生成履歴テーブル）**
   - `recurringId`: `integer` (`recurring_expenses.id` への外部キー。`ON DELETE CASCADE`)
   - `billingMonth`: `text` (`YYYY-MM` 形式)
   - `createdAt`: `text` (NOT NULL, ISO 8601)
   - **複合主キー:** `(recurringId, billingMonth)`
   - 自動計上実行時に本テーブルへ処理済み記録を残すことで、ユーザーが当月分の自動生成明細を手動削除した場合でも同月内に意図せず再生成（復活）されることを防ぐ。マスタ削除時は `ON DELETE CASCADE` で履歴も自動削除される。

4. **`monthly_budgets`（月間総予算テーブル）**
   - `month`: `text` (PK, `YYYY-MM` 形式)
   - `amount`: `integer` (NOT NULL, `0` 以上の整数・円単位)
   - `updatedAt`: `text` (NOT NULL, ISO 8601)

### 2.2 固定費のオンデマンド当月スナップショット生成方式

- **生成タイミング:** ユーザーが `/finance` にアクセスした際、**現在の実年月（`currentMonth`）** に限り、まだ当月分が生成されていない有効（`isActive = true`）な固定費マスタを検索し、`finance_transactions` へ実体レコードとして `INSERT`（`ON CONFLICT DO NOTHING`）する。
- **未来月・過去月の保護:** 未来月のレコードは事前生成しない。また、過去の月を閲覧した際にも自動生成は実行しない。
- **マスタ編集・解約時の安全性:**
  - マスタの `amount` や `title`、`category`、`dayOfMonth` を編集した場合、**翌月以降に新規生成されるスナップショットから新設定が適用**される。すでに `finance_transactions` に実体化されている過去月・当月の明細には一切影響しない。
  - マスタを `isActive = false` に切り替えるか、マスタ自体を削除（`ON DELETE SET NULL`）した場合、過去の明細はそのまま保持され、翌月以降の自動計上のみが停止される。
  - ユーザーが当月中に生成済みの固定費明細を手動削除した場合でも、`recurring_generations` テーブルに当月生成済み記録が残るため、同月内に重複再生成（復活）されることを防止できる（※再生成したい場合は手動入力またはマスタ側の操作で行う）。

### 2.3 月間予算の継承ルール

- 対象月に `monthly_budgets` レコードが未設定の場合、直近の過去月に設定された予算額を表示上のデフォルト値（継承値）として参照し、毎月の再設定の手間を省く。明示的に保存された場合はその月のレコードとして永続化する。

---

## 3. 検討した代替案と却下理由

- **代替案 A: 毎月ユーザーが「固定費一括計上ボタン」を押すテンプレート方式**
  - *却下理由:* 月初の押し忘れにより、実質的な自由費（予算残高）が実際より多く見えてしまうリスクがある。自動計上＋マスタ有効/停止トグルの方が普段使いの負荷が低い。
- **代替案 B: 固定費を明細テーブルにコピーせず、表示時にマスタと合算して計算する仮想合算方式**
  - *却下理由:* 固定費の金額改定や解約を行った瞬間に過去月の集計値まで変動してしまうため不採用。実体レコードとしてスナップショット保存する方式を採用した。

---

## 4. 影響範囲

- `src/db/schema.ts`: 上記 4 テーブルおよびインデックス定義の追加。
- `drizzle/`: `drizzle-kit generate` によるマイグレーション SQL の追加。
- `src/db/index.ts`: DB 接続時の `PRAGMA foreign_keys = ON` 有効化。
- `src/lib/finance.ts`: 集計ロジック・固定費スナップショット生成・予算継承ロジックの実装。
- `src/app/finance/page.tsx` および関連コンポーネント・Server Actions の新規作成。
- 左サイドバーナビゲーションへの `Finance` リンク追加。

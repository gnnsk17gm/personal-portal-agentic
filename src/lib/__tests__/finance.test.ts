import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import {
  calculateCategoryBreakdown,
  calculateMonthlySummary,
  createRecurringExpense,
  createTransaction,
  deleteRecurringExpense,
  deleteTransaction,
  ensureRecurringTransactionsForMonth,
  getMonthlyBudget,
  hasRecurringGenerationRecord,
  listRecurringExpenses,
  listTransactionsByMonth,
  shiftMonth,
  toggleRecurringExpenseActive,
  updateRecurringExpense,
  updateTransaction,
  upsertMonthlyBudget,
} from '@/lib/finance';

describe('finance domain logic', () => {
  let db: AppDb;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('収支明細 CRUD と月次集計', () => {
    it('支出・収入の登録、更新、削除が永続化され、日付降順・ID降順で取得できる', () => {
      const tx1 = createTransaction(
        { type: 'expense', amount: 1200, category: '食費', date: '2026-11-10', note: 'ランチ' },
        db,
      );
      const tx2 = createTransaction(
        { type: 'expense', amount: 3500, category: '日用品', date: '2026-11-10', note: '洗剤など' },
        db,
      );
      const tx3 = createTransaction(
        { type: 'income', amount: 250000, category: '給与', date: '2026-11-25', note: '11月分' },
        db,
      );

      const list = listTransactionsByMonth('2026-11', db);
      expect(list.map((t) => t.id)).toEqual([tx3.id, tx2.id, tx1.id]);

      const updated = updateTransaction(
        tx1.id,
        { amount: 1500, category: '交際費', date: '2026-11-11', note: '会食ランチ' },
        db,
      );
      expect(updated).toMatchObject({
        id: tx1.id,
        amount: 1500,
        category: '交際費',
        date: '2026-11-11',
        note: '会食ランチ',
      });

      expect(deleteTransaction(tx2.id, db)).toBe(true);
      expect(listTransactionsByMonth('2026-11', db)).toHaveLength(2);
    });

    it('不正な入力（金額0以下・不正カテゴリ・不正日付・100文字超メモ）を拒否する', () => {
      expect(() =>
        createTransaction({ type: 'expense', amount: 0, category: '食費', date: '2026-11-10' }, db),
      ).toThrow();
      expect(() =>
        createTransaction(
          { type: 'expense', amount: 1000, category: '給与', date: '2026-11-10' },
          db,
        ),
      ).toThrow();
      expect(() =>
        createTransaction(
          { type: 'expense', amount: 1000, category: '食費', date: '2026-02-30' },
          db,
        ),
      ).toThrow();
      expect(() =>
        createTransaction(
          {
            type: 'expense',
            amount: 1000,
            category: '食費',
            date: '2026-11-10',
            note: 'あ'.repeat(101),
          },
          db,
        ),
      ).toThrow();
    });

    it('収支合計・収支バランス・前月比・予算消化率・カテゴリ構成比を切り捨て精度で計算する', () => {
      // 前月（2026-10）: 支出 30,000円
      createTransaction(
        { type: 'expense', amount: 30000, category: '食費', date: '2026-10-05' },
        db,
      );
      // 当月（2026-11）: 支出 35,000円（食費 20,000 + 交通費 15,000）、収入 100,000円
      createTransaction(
        { type: 'expense', amount: 20000, category: '食費', date: '2026-11-01' },
        db,
      );
      createTransaction(
        { type: 'expense', amount: 15000, category: '交通費', date: '2026-11-02' },
        db,
      );
      createTransaction(
        { type: 'income', amount: 100000, category: '給与', date: '2026-11-25' },
        db,
      );
      const budget = upsertMonthlyBudget('2026-11', 60000, db);

      const currentTxs = listTransactionsByMonth('2026-11', db);
      const prevTxs = listTransactionsByMonth('2026-10', db);

      const summary = calculateMonthlySummary({
        month: '2026-11',
        transactions: currentTxs,
        prevMonthTransactions: prevTxs,
        budget,
      });

      expect(summary.totalExpense).toBe(35000);
      expect(summary.totalIncome).toBe(100000);
      expect(summary.balance).toBe(65000);
      expect(summary.prevMonthExpense).toBe(30000);
      expect(summary.expenseDiffFromPrevMonth).toBe(5000);
      // 5000 / 30000 * 100 = 16.666... -> 切り捨て 16
      expect(summary.expenseDiffPercent).toBe(16);
      expect(summary.budgetRemaining).toBe(25000);
      // 35000 / 60000 * 100 = 58.333... -> 切り捨て 58
      expect(summary.budgetUsagePercent).toBe(58);
      expect(summary.isOverBudget).toBe(false);

      const breakdown = calculateCategoryBreakdown(currentTxs);
      expect(breakdown).toEqual([
        // 20000 / 35000 * 100 = 57.14... -> 57
        { category: '食費', amount: 20000, percentage: 57, count: 1 },
        // 15000 / 35000 * 100 = 42.85... -> 42
        { category: '交通費', amount: 15000, percentage: 42, count: 1 },
      ]);
    });

    it('予算超過時に isOverBudget が true になり残額がマイナスになる', () => {
      createTransaction(
        { type: 'expense', amount: 55000, category: '住居・光熱通信', date: '2026-11-05' },
        db,
      );
      const budget = upsertMonthlyBudget('2026-11', 50000, db);
      const summary = calculateMonthlySummary({
        month: '2026-11',
        transactions: listTransactionsByMonth('2026-11', db),
        prevMonthTransactions: [],
        budget,
      });

      expect(summary.isOverBudget).toBe(true);
      expect(summary.budgetRemaining).toBe(-5000);
      expect(summary.budgetUsagePercent).toBe(110);
    });
  });

  describe('月間予算の保存と直近過去月からの継承', () => {
    it('未設定の月は直近過去月の予算を継承し、明示設定すれば上書きされる', () => {
      expect(getMonthlyBudget('2026-11', db)).toEqual({
        month: '2026-11',
        amount: null,
        isInherited: false,
        inheritedFromMonth: null,
      });

      upsertMonthlyBudget('2026-09', 120000, db);
      upsertMonthlyBudget('2026-10', 150000, db);

      // 2026-11 は 2026-10 から継承される
      expect(getMonthlyBudget('2026-11', db)).toEqual({
        month: '2026-11',
        amount: 150000,
        isInherited: true,
        inheritedFromMonth: '2026-10',
      });

      // 2026-08 はそれより過去がないため null
      expect(getMonthlyBudget('2026-08', db).amount).toBeNull();

      // 2026-11 を明示的に保存すると継承ではなくなる
      upsertMonthlyBudget('2026-11', 180000, db);
      expect(getMonthlyBudget('2026-11', db)).toEqual({
        month: '2026-11',
        amount: 180000,
        isInherited: false,
        inheritedFromMonth: null,
      });
    });
  });

  describe('固定費スナップショット自動計上エンジン', () => {
    it('当月に対してのみ自動生成され、同一月で何度実行しても二重計上されない（冪等性）', () => {
      createRecurringExpense(
        { title: '家賃', amount: 80000, category: '住居・光熱通信', dayOfMonth: 1 },
        db,
      );
      createRecurringExpense(
        { title: '動画サブスク', amount: 1490, category: '趣味・娯楽', dayOfMonth: 15 },
        db,
      );

      // 過去月・未来月では自動生成されない
      expect(
        ensureRecurringTransactionsForMonth('2026-10', { currentMonth: '2026-11' }, db),
      ).toBe(0);
      expect(
        ensureRecurringTransactionsForMonth('2026-12', { currentMonth: '2026-11' }, db),
      ).toBe(0);
      expect(listTransactionsByMonth('2026-10', db)).toHaveLength(0);
      expect(listTransactionsByMonth('2026-12', db)).toHaveLength(0);

      // 当月初回実行で2件生成
      expect(
        ensureRecurringTransactionsForMonth('2026-11', { currentMonth: '2026-11' }, db),
      ).toBe(2);
      const txs = listTransactionsByMonth('2026-11', db);
      expect(txs).toHaveLength(2);
      expect(txs[0]).toMatchObject({
        amount: 1490,
        category: '趣味・娯楽',
        date: '2026-11-15',
        note: '動画サブスク',
        billingMonth: '2026-11',
      });
      expect(txs[1]).toMatchObject({
        amount: 80000,
        category: '住居・光熱通信',
        date: '2026-11-01',
        note: '家賃',
        billingMonth: '2026-11',
      });

      // 2回目以降は 0 件（二重登録されない）
      expect(
        ensureRecurringTransactionsForMonth('2026-11', { currentMonth: '2026-11' }, db),
      ).toBe(0);
      expect(listTransactionsByMonth('2026-11', db)).toHaveLength(2);
    });

    it('当月生成された固定費明細を手動削除しても、同月内に復活（再生成）しない', () => {
      const recurring = createRecurringExpense(
        { title: 'ジム', amount: 8800, category: '医療・健康', dayOfMonth: 5 },
        db,
      );

      expect(
        ensureRecurringTransactionsForMonth('2026-11', { currentMonth: '2026-11' }, db),
      ).toBe(1);
      const [generated] = listTransactionsByMonth('2026-11', db);
      expect(deleteTransaction(generated.id, db)).toBe(true);

      // 再実行しても復活しない
      expect(
        ensureRecurringTransactionsForMonth('2026-11', { currentMonth: '2026-11' }, db),
      ).toBe(0);
      expect(listTransactionsByMonth('2026-11', db)).toHaveLength(0);
      expect(hasRecurringGenerationRecord(recurring.id, '2026-11', db)).toBe(true);

      // 翌月になれば通常どおり生成される
      expect(
        ensureRecurringTransactionsForMonth('2026-12', { currentMonth: '2026-12' }, db),
      ).toBe(1);
      expect(listTransactionsByMonth('2026-12', db)).toHaveLength(1);
    });

    it('固定費マスタの編集・停止・削除後も既存スナップショットは不変で、翌月から新設定が適用される', () => {
      const rent = createRecurringExpense(
        { title: '家賃', amount: 80000, category: '住居・光熱通信', dayOfMonth: 1 },
        db,
      );
      const sub = createRecurringExpense(
        { title: '音楽サブスク', amount: 1080, category: '趣味・娯楽', dayOfMonth: 10 },
        db,
      );
      const cloud = createRecurringExpense(
        { title: 'クラウドストレージ', amount: 400, category: '住居・光熱通信', dayOfMonth: 20 },
        db,
      );

      // 2026-11 に自動計上
      expect(
        ensureRecurringTransactionsForMonth('2026-11', { currentMonth: '2026-11' }, db),
      ).toBe(3);

      // 1) 家賃を値上げ（80,000 -> 85,000）
      updateRecurringExpense(
        rent.id,
        { title: '家賃（改定後）', amount: 85000, category: '住居・光熱通信', dayOfMonth: 2 },
        db,
      );
      // 2) 音楽サブスクを停止
      toggleRecurringExpenseActive(sub.id, false, db);
      // 3) クラウドストレージを削除（ON DELETE SET NULL & ON DELETE CASCADE）
      expect(deleteRecurringExpense(cloud.id, db)).toBe(true);
      expect(hasRecurringGenerationRecord(cloud.id, '2026-11', db)).toBe(false);

      // 2026-11 の既存スナップショットは一切変わっていないこと
      const novTxs = listTransactionsByMonth('2026-11', db);
      expect(novTxs).toHaveLength(3);
      const novRent = novTxs.find((t) => t.note === '家賃');
      const novSub = novTxs.find((t) => t.note === '音楽サブスク');
      const novCloud = novTxs.find((t) => t.note === 'クラウドストレージ');

      expect(novRent).toMatchObject({ amount: 80000, date: '2026-11-01', recurringId: rent.id });
      expect(novSub).toMatchObject({ amount: 1080, date: '2026-11-10', recurringId: sub.id });
      // マスタ削除された明細は履歴として残り、recurringId のみ null になる
      expect(novCloud).toMatchObject({ amount: 400, date: '2026-11-20', recurringId: null });

      // 2026-12（翌月相当）では有効な家賃のみ新設定で自動計上される
      expect(
        ensureRecurringTransactionsForMonth('2026-12', { currentMonth: '2026-12' }, db),
      ).toBe(1);
      const decTxs = listTransactionsByMonth('2026-12', db);
      expect(decTxs).toHaveLength(1);
      expect(decTxs[0]).toMatchObject({
        amount: 85000,
        date: '2026-12-02',
        note: '家賃（改定後）',
        recurringId: rent.id,
        billingMonth: '2026-12',
      });

      // マスタ一覧には家賃（有効）と音楽サブスク（停止）のみ残る
      expect(listRecurringExpenses(db)).toHaveLength(2);
    });
  });

  describe('月移動ユーティリティ', () => {
    it('年またぎの前月・次月を正しく計算できる', () => {
      expect(shiftMonth('2026-01', -1)).toBe('2025-12');
      expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    });
  });
});

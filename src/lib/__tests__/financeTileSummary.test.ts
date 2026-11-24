import { describe, expect, it } from 'vitest';
import type { CategoryBreakdownItem, MonthlySummary } from '@/lib/finance';
import { buildFinanceTileSummary } from '@/lib/financeTileSummary';

function createBaseSummary(overrides: Partial<MonthlySummary> = {}): MonthlySummary {
  return {
    month: '2026-11',
    totalExpense: 0,
    totalIncome: 0,
    balance: 0,
    prevMonthExpense: 0,
    expenseDiffFromPrevMonth: 0,
    expenseDiffPercent: null,
    budget: {
      month: '2026-11',
      amount: null,
      isInherited: false,
      inheritedFromMonth: null,
    },
    budgetRemaining: null,
    budgetUsagePercent: null,
    isOverBudget: false,
    ...overrides,
  };
}

describe('buildFinanceTileSummary', () => {
  it('支出 0 円・予算未設定の状態で NaN を含まず安全にサマリーを返す', () => {
    const result = buildFinanceTileSummary({
      summary: createBaseSummary(),
      categoryBreakdown: [],
    });

    expect(result).toEqual({
      month: '2026-11',
      totalExpense: 0,
      totalIncome: 0,
      balance: 0,
      hasBudget: false,
      budgetAmount: null,
      budgetRemaining: null,
      budgetUsagePercent: null,
      progressBarPercent: 0,
      isOverBudget: false,
      topCategories: [],
      otherCategoriesCount: 0,
      allCategories: [],
      hasExpenses: false,
    });
  });

  it('予算未設定時は hasBudget=false となり、収支バランス情報を返す', () => {
    const result = buildFinanceTileSummary({
      summary: createBaseSummary({
        totalExpense: 42000,
        totalIncome: 250000,
        balance: 208000,
      }),
      categoryBreakdown: [
        { category: '食費', amount: 30000, percentage: 71, count: 5 },
        { category: '交通費', amount: 12000, percentage: 28, count: 2 },
      ],
    });

    expect(result.hasBudget).toBe(false);
    expect(result.budgetRemaining).toBeNull();
    expect(result.progressBarPercent).toBe(0);
    expect(result.balance).toBe(208000);
    expect(result.hasExpenses).toBe(true);
    expect(result.topCategories).toHaveLength(2);
    expect(result.otherCategoriesCount).toBe(0);
  });

  it('予算設定済み（予算内）のとき、残額・消化率・クランプ済み進捗率を返す', () => {
    const result = buildFinanceTileSummary({
      summary: createBaseSummary({
        totalExpense: 65000,
        totalIncome: 200000,
        balance: 135000,
        budget: {
          month: '2026-11',
          amount: 100000,
          isInherited: false,
          inheritedFromMonth: null,
        },
        budgetRemaining: 35000,
        budgetUsagePercent: 65,
        isOverBudget: false,
      }),
      categoryBreakdown: [{ category: '食費', amount: 65000, percentage: 100, count: 8 }],
    });

    expect(result.hasBudget).toBe(true);
    expect(result.budgetAmount).toBe(100000);
    expect(result.budgetRemaining).toBe(35000);
    expect(result.budgetUsagePercent).toBe(65);
    expect(result.progressBarPercent).toBe(65);
    expect(result.isOverBudget).toBe(false);
  });

  it('予算超過時は負の残額と isOverBudget=true を返し、progressBarPercent は 100 にクランプする', () => {
    const result = buildFinanceTileSummary({
      summary: createBaseSummary({
        totalExpense: 125000,
        budget: {
          month: '2026-11',
          amount: 100000,
          isInherited: true,
          inheritedFromMonth: '2026-10',
        },
        budgetRemaining: -25000,
        budgetUsagePercent: 125,
        isOverBudget: true,
      }),
      categoryBreakdown: [{ category: '住居・光熱通信', amount: 125000, percentage: 100, count: 1 }],
    });

    expect(result.hasBudget).toBe(true);
    expect(result.budgetRemaining).toBe(-25000);
    expect(result.budgetUsagePercent).toBe(125);
    expect(result.progressBarPercent).toBe(100);
    expect(result.isOverBudget).toBe(true);
  });

  it('予算 0 円かつ支出 0 円でも NaN にならず 0% を返す', () => {
    const result = buildFinanceTileSummary({
      summary: createBaseSummary({
        totalExpense: 0,
        budget: {
          month: '2026-11',
          amount: 0,
          isInherited: false,
          inheritedFromMonth: null,
        },
        budgetRemaining: 0,
        budgetUsagePercent: 0,
        isOverBudget: false,
      }),
      categoryBreakdown: [],
    });

    expect(result.hasBudget).toBe(true);
    expect(result.budgetRemaining).toBe(0);
    expect(result.budgetUsagePercent).toBe(0);
    expect(result.progressBarPercent).toBe(0);
    expect(Number.isNaN(result.progressBarPercent)).toBe(false);
  });

  it('4 カテゴリ以上ある場合は上位 3 カテゴリのみ抽出し、残り件数を otherCategoriesCount に設定する', () => {
    const breakdown: CategoryBreakdownItem[] = [
      { category: '住居・光熱通信', amount: 80000, percentage: 50, count: 1 },
      { category: '食費', amount: 40000, percentage: 25, count: 10 },
      { category: '日用品', amount: 20000, percentage: 12, count: 4 },
      { category: '交通費', amount: 12000, percentage: 7, count: 3 },
      { category: '趣味・娯楽', amount: 8000, percentage: 5, count: 2 },
    ];

    const result = buildFinanceTileSummary({
      summary: createBaseSummary({ totalExpense: 160000 }),
      categoryBreakdown: breakdown,
    });

    expect(result.topCategories.map((c) => c.category)).toEqual([
      '住居・光熱通信',
      '食費',
      '日用品',
    ]);
    expect(result.otherCategoriesCount).toBe(2);
    expect(result.allCategories).toHaveLength(5);
  });
});

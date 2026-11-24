import type { CategoryBreakdownItem, MonthlySummary } from '@/lib/finance';

export const MAX_TILE_TOP_CATEGORIES = 3;

export interface FinanceTileSummaryInput {
  summary: MonthlySummary;
  categoryBreakdown: readonly CategoryBreakdownItem[];
}

export interface FinanceTileSummary {
  month: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  hasBudget: boolean;
  budgetAmount: number | null;
  budgetRemaining: number | null;
  budgetUsagePercent: number | null;
  /** プログレスバー描画用の 0〜100 クランプ済み整数値（予算未設定時は 0） */
  progressBarPercent: number;
  isOverBudget: boolean;
  /** 上位最大 3 カテゴリ */
  topCategories: CategoryBreakdownItem[];
  /** 上位 3 カテゴリ以外の件数 */
  otherCategoriesCount: number;
  /** ドーナツグラフ描画用の全カテゴリ内訳 */
  allCategories: CategoryBreakdownItem[];
  hasExpenses: boolean;
}

function clampProgressPercent(value: number | null): number {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.floor(value)));
}

/**
 * 月次家計簿オーバービューからダッシュボード Finance タイル表示用の軽量サマリーを構築する純関数。
 */
export function buildFinanceTileSummary(input: FinanceTileSummaryInput): FinanceTileSummary {
  const { summary, categoryBreakdown } = input;
  const totalExpense = Math.trunc(summary.totalExpense);
  const totalIncome = Math.trunc(summary.totalIncome);
  const balance = Math.trunc(summary.balance);

  const hasBudget = summary.budget.amount !== null;
  const budgetAmount = hasBudget && summary.budget.amount !== null
    ? Math.trunc(summary.budget.amount)
    : null;
  const budgetRemaining =
    hasBudget && summary.budgetRemaining !== null ? Math.trunc(summary.budgetRemaining) : null;
  const budgetUsagePercent =
    hasBudget && summary.budgetUsagePercent !== null && Number.isFinite(summary.budgetUsagePercent)
      ? Math.floor(summary.budgetUsagePercent)
      : null;

  const progressBarPercent = hasBudget ? clampProgressPercent(budgetUsagePercent) : 0;
  const isOverBudget = hasBudget && summary.isOverBudget;

  const allCategories = categoryBreakdown.map((item) => ({ ...item }));
  const topCategories = allCategories.slice(0, MAX_TILE_TOP_CATEGORIES);
  const otherCategoriesCount = Math.max(0, allCategories.length - MAX_TILE_TOP_CATEGORIES);

  return {
    month: summary.month,
    totalExpense,
    totalIncome,
    balance,
    hasBudget,
    budgetAmount,
    budgetRemaining,
    budgetUsagePercent,
    progressBarPercent,
    isOverBudget,
    topCategories,
    otherCategoriesCount,
    allCategories,
    hasExpenses: totalExpense > 0 && allCategories.length > 0,
  };
}

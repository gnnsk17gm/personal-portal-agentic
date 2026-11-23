export const TRANSACTION_TYPES = ['expense', 'income'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  '食費',
  '日用品',
  '交通費',
  '住居・光熱通信',
  '趣味・娯楽',
  '医療・健康',
  '衣服・美容',
  '交際費',
  'その他',
] as const;

export const INCOME_CATEGORIES = [
  '給与',
  '賞与・副収入',
  '臨時収入',
  'その他',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type FinanceCategory = ExpenseCategory | IncomeCategory;

export const MAX_NOTE_LENGTH = 100;
export const MAX_RECURRING_TITLE_LENGTH = 60;
export const MIN_TRANSACTION_AMOUNT = 1;
export const MAX_FINANCE_AMOUNT = 100_000_000;
export const MIN_DAY_OF_MONTH = 1;
export const MAX_DAY_OF_MONTH = 28;

export interface CategoryStyle {
  badgeClass: string;
  barClass: string;
  strokeColor: string;
}

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  badgeClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  barClass: 'bg-slate-400',
  strokeColor: '#94a3b8',
};

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  食費: {
    badgeClass: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    barClass: 'bg-orange-400',
    strokeColor: '#fb923c',
  },
  日用品: {
    badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    barClass: 'bg-amber-400',
    strokeColor: '#fbbf24',
  },
  交通費: {
    badgeClass: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    barClass: 'bg-sky-400',
    strokeColor: '#38bdf8',
  },
  '住居・光熱通信': {
    badgeClass: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    barClass: 'bg-indigo-400',
    strokeColor: '#818cf8',
  },
  '趣味・娯楽': {
    badgeClass: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    barClass: 'bg-violet-400',
    strokeColor: '#a78bfa',
  },
  '医療・健康': {
    badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    barClass: 'bg-rose-400',
    strokeColor: '#fb7185',
  },
  '衣服・美容': {
    badgeClass: 'bg-pink-50 text-pink-700 ring-1 ring-pink-200',
    barClass: 'bg-pink-400',
    strokeColor: '#f472b6',
  },
  交際費: {
    badgeClass: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
    barClass: 'bg-teal-400',
    strokeColor: '#2dd4bf',
  },
  給与: {
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    barClass: 'bg-emerald-500',
    strokeColor: '#10b981',
  },
  '賞与・副収入': {
    badgeClass: 'bg-green-50 text-green-700 ring-1 ring-green-200',
    barClass: 'bg-green-500',
    strokeColor: '#22c55e',
  },
  臨時収入: {
    badgeClass: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200',
    barClass: 'bg-cyan-500',
    strokeColor: '#06b6d4',
  },
  その他: DEFAULT_CATEGORY_STYLE,
};

export function isValidTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPES as readonly string[]).includes(value);
}

export function getCategoriesForType(type: TransactionType): readonly string[] {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

export function isValidCategoryForType(type: TransactionType, category: string): boolean {
  return getCategoriesForType(type).includes(category);
}

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
}

export function formatYen(amount: number): string {
  const truncated = Math.trunc(amount);
  const abs = Math.abs(truncated).toLocaleString('ja-JP');
  return truncated < 0 ? `-¥${abs}` : `¥${abs}`;
}

export function formatSignedYen(amount: number): string {
  const truncated = Math.trunc(amount);
  if (truncated > 0) return `+¥${truncated.toLocaleString('ja-JP')}`;
  return formatYen(truncated);
}

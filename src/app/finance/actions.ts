'use server';

import { revalidatePath } from 'next/cache';
import {
  bulkCreateTransactions,
  classifyAmexImportRows,
  createRecurringExpense,
  createTransaction,
  deleteRecurringExpense,
  deleteTransaction,
  toggleRecurringExpenseActive,
  updateRecurringExpense,
  updateTransaction,
  upsertMonthlyBudget,
  type BulkCreateTransactionItem,
  type ClassifiedAmexRow,
} from '@/lib/finance';
import { isValidTransactionType, type TransactionType } from '@/lib/finance-constants';

export interface FinanceActionResult {
  ok: boolean;
  error: string | null;
}

export interface FinanceFormState {
  ok: boolean;
  error: string | null;
  nonce: number;
}

function parseStrictInt(raw: FormDataEntryValue | null): number {
  if (typeof raw !== 'string') return Number.NaN;
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return Number.NaN;
  return Number.parseInt(trimmed, 10);
}

function revalidateFinance(): void {
  revalidatePath('/finance');
}

export async function createTransactionAction(
  prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const rawType = formData.get('type');
  const rawCategory = formData.get('category');
  const rawDate = formData.get('date');
  const rawNote = formData.get('note');
  const amount = parseStrictInt(formData.get('amount'));

  const type = typeof rawType === 'string' && isValidTransactionType(rawType) ? rawType : null;
  if (!type) {
    return { ok: false, error: '収支種別が不正です', nonce: prev.nonce + 1 };
  }

  try {
    createTransaction({
      type,
      amount,
      category: typeof rawCategory === 'string' ? rawCategory : '',
      date: typeof rawDate === 'string' ? rawDate : '',
      note: typeof rawNote === 'string' ? rawNote : '',
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '収支の登録に失敗しました',
      nonce: prev.nonce + 1,
    };
  }

  revalidateFinance();
  return { ok: true, error: null, nonce: prev.nonce + 1 };
}

export async function updateTransactionAction(
  id: number,
  input: {
    type?: TransactionType;
    amount: number;
    category: string;
    date: string;
    note: string;
  },
): Promise<FinanceActionResult> {
  try {
    const updated = updateTransaction(id, input);
    if (!updated) {
      return { ok: false, error: '対象の明細が見つかりませんでした' };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '明細の更新に失敗しました',
    };
  }

  revalidateFinance();
  return { ok: true, error: null };
}

export async function deleteTransactionAction(id: number): Promise<FinanceActionResult> {
  try {
    const deleted = deleteTransaction(id);
    if (!deleted) {
      return { ok: false, error: '対象の明細が見つかりませんでした' };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '明細の削除に失敗しました',
    };
  }

  revalidateFinance();
  return { ok: true, error: null };
}

export async function upsertMonthlyBudgetAction(
  month: string,
  amount: number,
): Promise<FinanceActionResult> {
  try {
    upsertMonthlyBudget(month, amount);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '月間予算の保存に失敗しました',
    };
  }

  revalidateFinance();
  return { ok: true, error: null };
}

export async function createRecurringExpenseAction(
  prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const rawTitle = formData.get('title');
  const rawCategory = formData.get('category');
  const amount = parseStrictInt(formData.get('amount'));
  const dayOfMonth = parseStrictInt(formData.get('dayOfMonth'));

  try {
    createRecurringExpense({
      title: typeof rawTitle === 'string' ? rawTitle : '',
      amount,
      category: typeof rawCategory === 'string' ? rawCategory : '',
      dayOfMonth,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '固定費の登録に失敗しました',
      nonce: prev.nonce + 1,
    };
  }

  revalidateFinance();
  return { ok: true, error: null, nonce: prev.nonce + 1 };
}

export async function updateRecurringExpenseAction(
  id: number,
  input: {
    title: string;
    amount: number;
    category: string;
    dayOfMonth: number;
    isActive?: boolean;
  },
): Promise<FinanceActionResult> {
  try {
    const updated = updateRecurringExpense(id, input);
    if (!updated) {
      return { ok: false, error: '対象の固定費が見つかりませんでした' };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '固定費の更新に失敗しました',
    };
  }

  revalidateFinance();
  return { ok: true, error: null };
}

export async function toggleRecurringExpenseAction(
  id: number,
  isActive?: boolean,
): Promise<FinanceActionResult> {
  try {
    const updated = toggleRecurringExpenseActive(id, isActive);
    if (!updated) {
      return { ok: false, error: '対象の固定費が見つかりませんでした' };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '固定費の状態切替に失敗しました',
    };
  }

  revalidateFinance();
  return { ok: true, error: null };
}

export async function deleteRecurringExpenseAction(id: number): Promise<FinanceActionResult> {
  try {
    const deleted = deleteRecurringExpense(id);
    if (!deleted) {
      return { ok: false, error: '対象の固定費が見つかりませんでした' };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '固定費の削除に失敗しました',
    };
  }

  revalidateFinance();
  return { ok: true, error: null };
}

export interface PreviewAmexCsvResult {
  ok: boolean;
  rows: ClassifiedAmexRow[];
  error: string | null;
}

export interface ImportAmexTransactionsResult {
  ok: boolean;
  insertedCount: number;
  months: string[];
  error: string | null;
}

interface RawPreviewRow {
  rowIndex: number;
  date: string;
  note: string;
  amount: number;
}

function isRawPreviewRow(value: unknown): value is RawPreviewRow {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.rowIndex === 'number' &&
    Number.isInteger(obj.rowIndex) &&
    typeof obj.date === 'string' &&
    typeof obj.note === 'string' &&
    typeof obj.amount === 'number' &&
    Number.isSafeInteger(obj.amount)
  );
}

function isBulkCreateItem(value: unknown): value is BulkCreateTransactionItem {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.date === 'string' &&
    typeof obj.amount === 'number' &&
    Number.isSafeInteger(obj.amount) &&
    typeof obj.category === 'string' &&
    typeof obj.note === 'string'
  );
}

export async function previewAmexCsvAction(
  rawRows: unknown,
): Promise<PreviewAmexCsvResult> {
  if (!Array.isArray(rawRows) || !rawRows.every(isRawPreviewRow)) {
    return { ok: false, rows: [], error: 'プレビューデータの形式が不正です' };
  }

  try {
    const classified = classifyAmexImportRows(rawRows);
    return { ok: true, rows: classified, error: null };
  } catch (e) {
    return {
      ok: false,
      rows: [],
      error: e instanceof Error ? e.message : 'プレビューの生成に失敗しました',
    };
  }
}

export async function importAmexTransactionsAction(
  rawItems: unknown,
): Promise<ImportAmexTransactionsResult> {
  if (!Array.isArray(rawItems) || !rawItems.every(isBulkCreateItem)) {
    return {
      ok: false,
      insertedCount: 0,
      months: [],
      error: '登録データの形式が不正です',
    };
  }

  if (rawItems.length === 0) {
    return {
      ok: false,
      insertedCount: 0,
      months: [],
      error: '取り込む明細を1件以上選択してください',
    };
  }

  try {
    const inserted = bulkCreateTransactions(rawItems);
    const months = Array.from(new Set(inserted.map((tx) => tx.date.slice(0, 7)))).sort();
    revalidateFinance();
    revalidatePath('/');
    return {
      ok: true,
      insertedCount: inserted.length,
      months,
      error: null,
    };
  } catch (e) {
    return {
      ok: false,
      insertedCount: 0,
      months: [],
      error: e instanceof Error ? e.message : '一括登録に失敗しました',
    };
  }
}

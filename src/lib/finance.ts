import { and, asc, desc, eq, inArray, like, lt } from 'drizzle-orm';
import { getDb, type AppDb } from '@/db';
import {
  financeTransactions,
  monthlyBudgets,
  recurringExpenses,
  recurringGenerations,
} from '@/db/schema';
import {
  inferExpenseCategory,
  normalizeMerchantNote,
  type ParsedAmexRow,
} from '@/lib/amexCsvParser';
import {
  MAX_DAY_OF_MONTH,
  MAX_FINANCE_AMOUNT,
  MAX_NOTE_LENGTH,
  MAX_RECURRING_TITLE_LENGTH,
  MIN_DAY_OF_MONTH,
  MIN_TRANSACTION_AMOUNT,
  isValidCategoryForType,
  isValidTransactionType,
  type ExpenseCategory,
  type TransactionType,
} from '@/lib/finance-constants';

export type FinanceTransactionRecord = typeof financeTransactions.$inferSelect;
export type RecurringExpenseRecord = typeof recurringExpenses.$inferSelect;

export interface MonthlyBudgetInfo {
  month: string;
  amount: number | null;
  isInherited: boolean;
  inheritedFromMonth: string | null;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlySummary {
  month: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  prevMonthExpense: number;
  expenseDiffFromPrevMonth: number;
  expenseDiffPercent: number | null;
  budget: MonthlyBudgetInfo;
  budgetRemaining: number | null;
  budgetUsagePercent: number | null;
  isOverBudget: boolean;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface CreateRecurringExpenseInput {
  title: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  isActive?: boolean;
}

export interface UpdateRecurringExpenseInput {
  title: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  isActive?: boolean;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidMonth(month: string): boolean {
  return MONTH_PATTERN.test(month);
}

export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getCurrentMonth(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getTodayDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftMonth(month: string, delta: number): string {
  if (!isValidMonth(month)) {
    throw new Error('対象月の形式が不正です（YYYY-MM）');
  }
  const [yearStr, monthStr] = month.split('-');
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1 + delta, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function normalizeMonthParam(
  raw: string | string[] | undefined,
  now: Date = new Date(),
): string {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (candidate && isValidMonth(candidate)) {
    return candidate;
  }
  return getCurrentMonth(now);
}

function validateAmount(amount: number, min: number): number {
  if (!Number.isInteger(amount) || amount < min || amount > MAX_FINANCE_AMOUNT) {
    throw new Error(`金額は ${min} 円以上 ${MAX_FINANCE_AMOUNT.toLocaleString('ja-JP')} 円以下の整数で入力してください`);
  }
  return amount;
}

function validateNote(note: string | undefined): string {
  const trimmed = (note ?? '').trim();
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new Error(`メモは ${MAX_NOTE_LENGTH} 文字以内で入力してください`);
  }
  return trimmed;
}

function validateRecurringTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new Error('固定費の名称を入力してください');
  }
  if (trimmed.length > MAX_RECURRING_TITLE_LENGTH) {
    throw new Error(`名称は ${MAX_RECURRING_TITLE_LENGTH} 文字以内で入力してください`);
  }
  return trimmed;
}

function validateDayOfMonth(dayOfMonth: number): number {
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < MIN_DAY_OF_MONTH || dayOfMonth > MAX_DAY_OF_MONTH) {
    throw new Error(`計上日は ${MIN_DAY_OF_MONTH}〜${MAX_DAY_OF_MONTH} 日の整数で指定してください`);
  }
  return dayOfMonth;
}

export function listTransactionsByMonth(
  month: string,
  db: AppDb = getDb(),
): FinanceTransactionRecord[] {
  if (!isValidMonth(month)) {
    throw new Error('対象月の形式が不正です（YYYY-MM）');
  }
  return db
    .select()
    .from(financeTransactions)
    .where(like(financeTransactions.date, `${month}-%`))
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.id))
    .all();
}

export function createTransaction(
  input: CreateTransactionInput,
  db: AppDb = getDb(),
): FinanceTransactionRecord {
  if (!isValidTransactionType(input.type)) {
    throw new Error('収支種別が不正です');
  }
  const amount = validateAmount(input.amount, MIN_TRANSACTION_AMOUNT);
  if (!isValidCategoryForType(input.type, input.category)) {
    throw new Error('選択された種別に対してカテゴリが不正です');
  }
  if (!isValidDate(input.date)) {
    throw new Error('日付の形式が不正です（YYYY-MM-DD）');
  }
  const note = validateNote(input.note);

  return db
    .insert(financeTransactions)
    .values({
      type: input.type,
      amount,
      category: input.category,
      date: input.date,
      note,
      recurringId: null,
      billingMonth: null,
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();
}

export function updateTransaction(
  id: number,
  input: UpdateTransactionInput,
  db: AppDb = getDb(),
): FinanceTransactionRecord | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  const existing = db
    .select()
    .from(financeTransactions)
    .where(eq(financeTransactions.id, id))
    .get();
  if (!existing) return null;

  const nextType = input.type ?? existing.type;
  if (!isValidTransactionType(nextType)) {
    throw new Error('収支種別が不正です');
  }
  const amount = validateAmount(input.amount, MIN_TRANSACTION_AMOUNT);
  if (!isValidCategoryForType(nextType, input.category)) {
    throw new Error('選択された種別に対してカテゴリが不正です');
  }
  if (!isValidDate(input.date)) {
    throw new Error('日付の形式が不正です（YYYY-MM-DD）');
  }
  const note = validateNote(input.note);

  return db
    .update(financeTransactions)
    .set({
      type: nextType,
      amount,
      category: input.category,
      date: input.date,
      note,
    })
    .where(eq(financeTransactions.id, id))
    .returning()
    .get();
}

export function deleteTransaction(id: number, db: AppDb = getDb()): boolean {
  if (!Number.isInteger(id) || id <= 0) return false;
  const result = db
    .delete(financeTransactions)
    .where(eq(financeTransactions.id, id))
    .run();
  return result.changes > 0;
}

export function getMonthlyBudget(month: string, db: AppDb = getDb()): MonthlyBudgetInfo {
  if (!isValidMonth(month)) {
    throw new Error('対象月の形式が不正です（YYYY-MM）');
  }

  const exact = db
    .select()
    .from(monthlyBudgets)
    .where(eq(monthlyBudgets.month, month))
    .get();

  if (exact) {
    return {
      month,
      amount: exact.amount,
      isInherited: false,
      inheritedFromMonth: null,
    };
  }

  const inherited = db
    .select()
    .from(monthlyBudgets)
    .where(lt(monthlyBudgets.month, month))
    .orderBy(desc(monthlyBudgets.month))
    .limit(1)
    .get();

  if (inherited) {
    return {
      month,
      amount: inherited.amount,
      isInherited: true,
      inheritedFromMonth: inherited.month,
    };
  }

  return {
    month,
    amount: null,
    isInherited: false,
    inheritedFromMonth: null,
  };
}

export function upsertMonthlyBudget(
  month: string,
  amount: number,
  db: AppDb = getDb(),
): MonthlyBudgetInfo {
  if (!isValidMonth(month)) {
    throw new Error('対象月の形式が不正です（YYYY-MM）');
  }
  const validatedAmount = validateAmount(amount, 0);
  const now = new Date().toISOString();

  db.insert(monthlyBudgets)
    .values({
      month,
      amount: validatedAmount,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: monthlyBudgets.month,
      set: {
        amount: validatedAmount,
        updatedAt: now,
      },
    })
    .run();

  return {
    month,
    amount: validatedAmount,
    isInherited: false,
    inheritedFromMonth: null,
  };
}

export function listRecurringExpenses(db: AppDb = getDb()): RecurringExpenseRecord[] {
  return db
    .select()
    .from(recurringExpenses)
    .orderBy(
      desc(recurringExpenses.isActive),
      asc(recurringExpenses.dayOfMonth),
      asc(recurringExpenses.id),
    )
    .all();
}

export function createRecurringExpense(
  input: CreateRecurringExpenseInput,
  db: AppDb = getDb(),
): RecurringExpenseRecord {
  const title = validateRecurringTitle(input.title);
  const amount = validateAmount(input.amount, MIN_TRANSACTION_AMOUNT);
  if (!isValidCategoryForType('expense', input.category)) {
    throw new Error('固定費のカテゴリが不正です');
  }
  const dayOfMonth = validateDayOfMonth(input.dayOfMonth);
  const now = new Date().toISOString();

  return db
    .insert(recurringExpenses)
    .values({
      title,
      amount,
      category: input.category,
      dayOfMonth,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

export function updateRecurringExpense(
  id: number,
  input: UpdateRecurringExpenseInput,
  db: AppDb = getDb(),
): RecurringExpenseRecord | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  const existing = db
    .select()
    .from(recurringExpenses)
    .where(eq(recurringExpenses.id, id))
    .get();
  if (!existing) return null;

  const title = validateRecurringTitle(input.title);
  const amount = validateAmount(input.amount, MIN_TRANSACTION_AMOUNT);
  if (!isValidCategoryForType('expense', input.category)) {
    throw new Error('固定費のカテゴリが不正です');
  }
  const dayOfMonth = validateDayOfMonth(input.dayOfMonth);

  return db
    .update(recurringExpenses)
    .set({
      title,
      amount,
      category: input.category,
      dayOfMonth,
      isActive: input.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(recurringExpenses.id, id))
    .returning()
    .get();
}

export function toggleRecurringExpenseActive(
  id: number,
  isActive?: boolean,
  db: AppDb = getDb(),
): RecurringExpenseRecord | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  const existing = db
    .select()
    .from(recurringExpenses)
    .where(eq(recurringExpenses.id, id))
    .get();
  if (!existing) return null;

  const nextActive = isActive ?? !existing.isActive;
  return db
    .update(recurringExpenses)
    .set({
      isActive: nextActive,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(recurringExpenses.id, id))
    .returning()
    .get();
}

export function deleteRecurringExpense(id: number, db: AppDb = getDb()): boolean {
  if (!Number.isInteger(id) || id <= 0) return false;
  const result = db
    .delete(recurringExpenses)
    .where(eq(recurringExpenses.id, id))
    .run();
  return result.changes > 0;
}

export interface EnsureRecurringOptions {
  currentMonth?: string;
  now?: Date;
}

/**
 * 対象月が現在の実年月と一致する場合のみ、有効な固定費マスタから当月スナップショットを生成する。
 * 既に当月処理済み（recurring_generations に記録あり）の固定費は、明細を手動削除済みでも再生成しない。
 */
export function ensureRecurringTransactionsForMonth(
  targetMonth: string,
  options?: EnsureRecurringOptions,
  db: AppDb = getDb(),
): number {
  if (!isValidMonth(targetMonth)) {
    throw new Error('対象月の形式が不正です（YYYY-MM）');
  }

  const currentMonth = options?.currentMonth ?? getCurrentMonth(options?.now);
  if (targetMonth !== currentMonth) {
    return 0;
  }

  const activeItems = db
    .select()
    .from(recurringExpenses)
    .where(eq(recurringExpenses.isActive, true))
    .orderBy(asc(recurringExpenses.dayOfMonth), asc(recurringExpenses.id))
    .all();

  if (activeItems.length === 0) {
    return 0;
  }

  const alreadyGeneratedRows = db
    .select({ recurringId: recurringGenerations.recurringId })
    .from(recurringGenerations)
    .where(eq(recurringGenerations.billingMonth, targetMonth))
    .all();

  const generatedIds = new Set(alreadyGeneratedRows.map((row) => row.recurringId));
  const pendingItems = activeItems.filter((item) => !generatedIds.has(item.id));
  if (pendingItems.length === 0) {
    return 0;
  }

  let createdCount = 0;
  const createdAt = (options?.now ?? new Date()).toISOString();

  db.transaction((tx) => {
    for (const item of pendingItems) {
      const genResult = tx
        .insert(recurringGenerations)
        .values({
          recurringId: item.id,
          billingMonth: targetMonth,
          createdAt,
        })
        .onConflictDoNothing()
        .run();

      if (genResult.changes === 0) {
        continue;
      }

      const day = String(item.dayOfMonth).padStart(2, '0');
      const txResult = tx
        .insert(financeTransactions)
        .values({
          type: 'expense',
          amount: item.amount,
          category: item.category,
          date: `${targetMonth}-${day}`,
          note: item.title,
          recurringId: item.id,
          billingMonth: targetMonth,
          createdAt,
        })
        .onConflictDoNothing()
        .run();

      if (txResult.changes > 0) {
        createdCount += 1;
      }
    }
  });

  return createdCount;
}

export function calculateCategoryBreakdown(
  transactions: readonly FinanceTransactionRecord[],
): CategoryBreakdownItem[] {
  const totals = new Map<string, { amount: number; count: number }>();
  let totalExpense = 0;

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    totalExpense += tx.amount;
    const prev = totals.get(tx.category) ?? { amount: 0, count: 0 };
    totals.set(tx.category, { amount: prev.amount + tx.amount, count: prev.count + 1 });
  }

  if (totalExpense === 0) {
    return [];
  }

  return Array.from(totals.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      // 端数は切り捨て（floor）
      percentage: Math.floor((amount * 100) / totalExpense),
      count,
    }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, 'ja'));
}

export function calculateMonthlySummary(params: {
  month: string;
  transactions: readonly FinanceTransactionRecord[];
  prevMonthTransactions: readonly FinanceTransactionRecord[];
  budget: MonthlyBudgetInfo;
}): MonthlySummary {
  let totalExpense = 0;
  let totalIncome = 0;

  for (const tx of params.transactions) {
    if (tx.type === 'expense') {
      totalExpense += tx.amount;
    } else {
      totalIncome += tx.amount;
    }
  }

  let prevMonthExpense = 0;
  for (const tx of params.prevMonthTransactions) {
    if (tx.type === 'expense') {
      prevMonthExpense += tx.amount;
    }
  }

  const balance = totalIncome - totalExpense;
  const expenseDiffFromPrevMonth = totalExpense - prevMonthExpense;
  // 端数は切り捨て（0 方向への切り捨て）
  const expenseDiffPercent =
    prevMonthExpense > 0
      ? Math.trunc(((totalExpense - prevMonthExpense) * 100) / prevMonthExpense)
      : null;

  const budgetAmount = params.budget.amount;
  const budgetRemaining = budgetAmount !== null ? budgetAmount - totalExpense : null;
  let budgetUsagePercent: number | null = null;
  if (budgetAmount !== null) {
    if (budgetAmount > 0) {
      budgetUsagePercent = Math.floor((totalExpense * 100) / budgetAmount);
    } else {
      budgetUsagePercent = totalExpense > 0 ? 100 : 0;
    }
  }

  return {
    month: params.month,
    totalExpense,
    totalIncome,
    balance,
    prevMonthExpense,
    expenseDiffFromPrevMonth,
    expenseDiffPercent,
    budget: params.budget,
    budgetRemaining,
    budgetUsagePercent,
    isOverBudget: budgetAmount !== null && totalExpense > budgetAmount,
  };
}

export function getMonthlyFinanceOverview(month: string, db: AppDb = getDb()) {
  const prevMonth = shiftMonth(month, -1);
  const transactions = listTransactionsByMonth(month, db);
  const prevMonthTransactions = listTransactionsByMonth(prevMonth, db);
  const budget = getMonthlyBudget(month, db);
  const summary = calculateMonthlySummary({
    month,
    transactions,
    prevMonthTransactions,
    budget,
  });
  const categoryBreakdown = calculateCategoryBreakdown(transactions);
  const recurringList = listRecurringExpenses(db);

  return {
    month,
    prevMonth,
    nextMonth: shiftMonth(month, 1),
    transactions,
    summary,
    categoryBreakdown,
    recurringList,
  };
}

export function hasRecurringGenerationRecord(
  recurringId: number,
  billingMonth: string,
  db: AppDb = getDb(),
): boolean {
  const row = db
    .select()
    .from(recurringGenerations)
    .where(
      and(
        eq(recurringGenerations.recurringId, recurringId),
        eq(recurringGenerations.billingMonth, billingMonth),
      ),
    )
    .get();
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// AMEX CSV インポート用ヘルパー（重複判定・過去履歴学習・一括トランザクション登録）
// ---------------------------------------------------------------------------

export type AmexImportRowStatus = 'new' | 'duplicate' | 'negative';

export interface ClassifiedAmexRow {
  rowIndex: number;
  date: string;
  note: string;
  amount: number;
  category: ExpenseCategory;
  categorySource: 'history' | 'keyword' | 'default';
  status: AmexImportRowStatus;
  selected: boolean;
}

export interface BulkCreateTransactionItem {
  date: string;
  amount: number;
  category: string;
  note: string;
}

export function buildDuplicateKey(date: string, amount: number, normalizedNote: string): string {
  return `${date}\u0000${amount}\u0000${normalizedNote}`;
}

/**
 * 指定日付群の既存支出明細について、(date, amount, 正規化済みnote) ごとの登録件数を返す。
 */
export function findExistingTransactionKeyCounts(
  dates: readonly string[],
  db: AppDb = getDb(),
): Map<string, number> {
  const uniqueDates = Array.from(new Set(dates.filter((d) => isValidDate(d))));
  const counts = new Map<string, number>();
  if (uniqueDates.length === 0) return counts;

  const existingRows = db
    .select({
      date: financeTransactions.date,
      amount: financeTransactions.amount,
      note: financeTransactions.note,
    })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.type, 'expense'),
        inArray(financeTransactions.date, uniqueDates),
      ),
    )
    .all();

  for (const row of existingRows) {
    const key = buildDuplicateKey(row.date, row.amount, normalizeMerchantNote(row.note));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * 既存の支出明細から、正規化済みメモごとの最直近カテゴリ（date DESC, id DESC）を取得する。
 */
export function getLatestExpenseCategoriesByNote(
  normalizedNotes: readonly string[],
  db: AppDb = getDb(),
): Map<string, ExpenseCategory> {
  const targetNotes = new Set(normalizedNotes.filter((n) => n.length > 0));
  const result = new Map<string, ExpenseCategory>();
  if (targetNotes.size === 0) return result;

  const rows = db
    .select({
      note: financeTransactions.note,
      category: financeTransactions.category,
    })
    .from(financeTransactions)
    .where(eq(financeTransactions.type, 'expense'))
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.id))
    .all();

  for (const row of rows) {
    const normalized = normalizeMerchantNote(row.note);
    if (!targetNotes.has(normalized) || result.has(normalized)) {
      continue;
    }
    if (isValidCategoryForType('expense', row.category)) {
      result.set(normalized, row.category as ExpenseCategory);
    }
    if (result.size === targetNotes.size) {
      break;
    }
  }

  return result;
}

/**
 * パース済み AMEX 明細行に対し、DB 照合に基づく重複判定（カウントベース）・マイナス除外判定・
 * カテゴリ推測（過去履歴優先 → キーワード辞書 → その他）を行う。
 */
export function classifyAmexImportRows(
  rows: readonly Pick<ParsedAmexRow, 'rowIndex' | 'date' | 'note' | 'amount'>[],
  db: AppDb = getDb(),
): ClassifiedAmexRow[] {
  const positiveRows = rows.filter((r) => r.amount > 0);
  const existingCounts = findExistingTransactionKeyCounts(
    positiveRows.map((r) => r.date),
    db,
  );
  const historyMap = getLatestExpenseCategoriesByNote(
    rows.map((r) => normalizeMerchantNote(r.note)),
    db,
  );

  return rows.map((row) => {
    const normalizedNote = normalizeMerchantNote(row.note);
    const inferred = inferExpenseCategory(normalizedNote, historyMap);

    if (row.amount <= 0) {
      return {
        rowIndex: row.rowIndex,
        date: row.date,
        note: normalizedNote,
        amount: row.amount,
        category: inferred.category,
        categorySource: inferred.source,
        status: 'negative',
        selected: false,
      };
    }

    const key = buildDuplicateKey(row.date, row.amount, normalizedNote);
    const remainingDupCount = existingCounts.get(key) ?? 0;
    if (remainingDupCount > 0) {
      existingCounts.set(key, remainingDupCount - 1);
      return {
        rowIndex: row.rowIndex,
        date: row.date,
        note: normalizedNote,
        amount: row.amount,
        category: inferred.category,
        categorySource: inferred.source,
        status: 'duplicate',
        selected: false,
      };
    }

    return {
      rowIndex: row.rowIndex,
      date: row.date,
      note: normalizedNote,
      amount: row.amount,
      category: inferred.category,
      categorySource: inferred.source,
      status: 'new',
      selected: true,
    };
  });
}

/**
 * 複数の支出明細を SQLite トランザクション内で一括登録する。
 * 1 件でもバリデーションエラーがある場合は全件ロールバックする。
 */
export function bulkCreateTransactions(
  items: readonly BulkCreateTransactionItem[],
  db: AppDb = getDb(),
): FinanceTransactionRecord[] {
  if (items.length === 0) return [];

  const createdAt = new Date().toISOString();
  const validated = items.map((item, idx) => {
    const amount = validateAmount(item.amount, MIN_TRANSACTION_AMOUNT);
    if (!isValidCategoryForType('expense', item.category)) {
      throw new Error(`${idx + 1}行目のカテゴリが不正です`);
    }
    if (!isValidDate(item.date)) {
      throw new Error(`${idx + 1}行目の日付形式が不正です（YYYY-MM-DD）`);
    }
    const note = validateNote(item.note);
    return {
      type: 'expense' as const,
      amount,
      category: item.category,
      date: item.date,
      note,
      recurringId: null,
      billingMonth: null,
      createdAt,
    };
  });

  return db.transaction((tx) => {
    const inserted: FinanceTransactionRecord[] = [];
    for (const row of validated) {
      const record = tx.insert(financeTransactions).values(row).returning().get();
      inserted.push(record);
    }
    return inserted;
  });
}

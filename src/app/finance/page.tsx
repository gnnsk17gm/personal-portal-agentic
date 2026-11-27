import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import AmexCsvImportModal from "@/components/finance/AmexCsvImportModal";
import CategoryBreakdown from "@/components/finance/CategoryBreakdown";
import FinanceSummaryCards from "@/components/finance/FinanceSummaryCards";
import QuickTransactionForm from "@/components/finance/QuickTransactionForm";
import RecurringExpenseManager from "@/components/finance/RecurringExpenseManager";
import TransactionList from "@/components/finance/TransactionList";
import {
  ensureRecurringTransactionsForMonth,
  getCurrentMonth,
  getMonthlyFinanceOverview,
  getTodayDateString,
  normalizeMonthParam,
} from "@/lib/finance";

export const dynamic = "force-dynamic";

function formatMonthHeading(month: string): string {
  const [year, m] = month.split("-");
  return `${year}年${Number(m)}月`;
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const currentMonth = getCurrentMonth(now);
  const month = normalizeMonthParam(params.month, now);

  // 当月アクセス時のみ有効な固定費をオンデマンドでスナップショット計上
  ensureRecurringTransactionsForMonth(month, { currentMonth, now });

  const overview = getMonthlyFinanceOverview(month);
  const rawCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const selectedCategory =
    typeof rawCategory === "string" && rawCategory.trim() !== "" ? rawCategory.trim() : null;

  const todayDate = getTodayDateString(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayDate = getTodayDateString(yesterday);

  const isCurrentMonth = month === currentMonth;

  return (
    <div className="space-y-6">
      {/* 対象月ナビゲーション */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-500" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">
            {formatMonthHeading(month)} の家計簿
          </h2>
          {isCurrentMonth ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              今月
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex items-center gap-1.5" aria-label="対象月の切り替え">
            <Link
              href={`/finance?month=${overview.prevMonth}`}
              aria-label="前月へ"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ChevronLeft size={14} aria-hidden="true" />
              前月
            </Link>
            {!isCurrentMonth ? (
              <Link
                href={`/finance?month=${currentMonth}`}
                className="rounded-lg border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
              >
                今月へ戻る
              </Link>
            ) : null}
            <Link
              href={`/finance?month=${overview.nextMonth}`}
              aria-label="次月へ"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              次月
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </nav>

          {/* 固定費・サブスク管理モーダルボタン */}
          <RecurringExpenseManager items={overview.recurringList} />

          {/* AMEX 利用明細 CSV インポートボタン */}
          <AmexCsvImportModal currentMonth={month} />
        </div>
      </div>

      {/* 月次サマリー & 予算管理 */}
      <FinanceSummaryCards summary={overview.summary} />

      {/* クイック収支入力 & カテゴリ別内訳 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QuickTransactionForm todayDate={todayDate} yesterdayDate={yesterdayDate} />
        <CategoryBreakdown
          month={month}
          items={overview.categoryBreakdown}
          totalExpense={overview.summary.totalExpense}
          selectedCategory={selectedCategory}
        />
      </div>

      {/* 収支明細一覧 */}
      <TransactionList
        month={month}
        transactions={overview.transactions}
        selectedCategory={selectedCategory}
      />
    </div>
  );
}

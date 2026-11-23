"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X, TrendingDown, TrendingUp, Scale, PiggyBank } from "lucide-react";
import { upsertMonthlyBudgetAction } from "@/app/finance/actions";
import type { MonthlySummary } from "@/lib/finance";
import { formatSignedYen, formatYen } from "@/lib/finance-constants";

interface FinanceSummaryCardsProps {
  summary: MonthlySummary;
}

export default function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    summary.budget.amount !== null ? String(summary.budget.amount) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleOpenEdit = () => {
    setBudgetInput(summary.budget.amount !== null ? String(summary.budget.amount) : "");
    setError(null);
    setEditingBudget(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseInt(budgetInput.trim(), 10);
    if (!/^\d+$/.test(budgetInput.trim()) || Number.isNaN(parsed) || parsed < 0) {
      setError("0円以上の整数で入力してください");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await upsertMonthlyBudgetAction(summary.month, parsed);
      if (!res.ok) {
        setError(res.error ?? "予算の保存に失敗しました");
        return;
      }
      setEditingBudget(false);
    });
  };

  const progressWidth =
    summary.budgetUsagePercent !== null ? Math.min(summary.budgetUsagePercent, 100) : 0;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="月次サマリー">
      {/* 1. 今月の支出合計 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>支出合計</span>
          <TrendingDown size={16} className="text-rose-500" aria-hidden="true" />
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {formatYen(summary.totalExpense)}
        </p>
        <p className="mt-1.5 text-xs text-slate-500">
          前月比:{" "}
          <span
            className={
              summary.expenseDiffFromPrevMonth > 0
                ? "font-medium text-rose-600"
                : summary.expenseDiffFromPrevMonth < 0
                  ? "font-medium text-emerald-600"
                  : "font-medium text-slate-600"
            }
          >
            {formatSignedYen(summary.expenseDiffFromPrevMonth)}
            {summary.expenseDiffPercent !== null
              ? ` (${summary.expenseDiffPercent > 0 ? "+" : ""}${summary.expenseDiffPercent}%)`
              : ""}
          </span>
        </p>
      </div>

      {/* 2. 今月の収入合計 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>収入合計</span>
          <TrendingUp size={16} className="text-emerald-500" aria-hidden="true" />
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {formatYen(summary.totalIncome)}
        </p>
        <p className="mt-1.5 text-xs text-slate-500">対象月の登録済み収入</p>
      </div>

      {/* 3. 今月の収支バランス */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>収支バランス</span>
          <Scale size={16} className="text-slate-500" aria-hidden="true" />
        </div>
        <p
          className={`mt-2 text-2xl font-bold tracking-tight ${
            summary.balance > 0
              ? "text-emerald-700"
              : summary.balance < 0
                ? "text-rose-600"
                : "text-slate-900"
          }`}
        >
          {formatSignedYen(summary.balance)}
        </p>
        <p className="mt-1.5 text-xs text-slate-500">収入 − 支出</p>
      </div>

      {/* 4. 月間総予算の残額 & 消化率 */}
      <div
        className={`rounded-xl border p-5 shadow-sm ${
          summary.isOverBudget
            ? "border-rose-200 bg-rose-50/40"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <PiggyBank
              size={16}
              className={summary.isOverBudget ? "text-rose-500" : "text-slate-500"}
              aria-hidden="true"
            />
            月間総予算の残額
          </span>
          {!editingBudget ? (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Pencil size={12} aria-hidden="true" />
              {summary.budget.amount !== null ? "変更" : "設定"}
            </button>
          ) : null}
        </div>

        {editingBudget ? (
          <form onSubmit={handleSaveBudget} className="mt-2 space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="例: 150000"
                aria-label="月間総予算（円）"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={pending}
                aria-label="予算を保存"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingBudget(false);
                  setError(null);
                }}
                aria-label="キャンセル"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <X size={14} />
              </button>
            </div>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          </form>
        ) : summary.budget.amount !== null && summary.budgetRemaining !== null ? (
          <>
            <p
              className={`mt-2 text-2xl font-bold tracking-tight ${
                summary.isOverBudget ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {formatYen(summary.budgetRemaining)}
            </p>
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    summary.isOverBudget
                      ? "bg-rose-500"
                      : (summary.budgetUsagePercent ?? 0) >= 80
                        ? "bg-amber-500"
                        : "bg-slate-900"
                  }`}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>
                  予算 {formatYen(summary.budget.amount)}
                  {summary.budget.isInherited && summary.budget.inheritedFromMonth
                    ? `（${summary.budget.inheritedFromMonth} 継承）`
                    : ""}
                </span>
                <span className={summary.isOverBudget ? "font-semibold text-rose-600" : ""}>
                  消化率 {summary.budgetUsagePercent}%
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-2">
            <p className="text-lg font-semibold text-slate-400">未設定</p>
            <p className="mt-1 text-xs text-slate-500">
              右上の「設定」から月間予算を登録できます
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

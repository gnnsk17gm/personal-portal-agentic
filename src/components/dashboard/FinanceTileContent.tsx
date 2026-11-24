import MiniDonutChart from "@/components/dashboard/MiniDonutChart";
import type { FinanceTileSummary } from "@/lib/financeTileSummary";
import { formatSignedYen, formatYen, getCategoryStyle } from "@/lib/finance-constants";

interface FinanceTileContentProps {
  summary: FinanceTileSummary;
}

/**
 * ホームダッシュボード 1:1 正方形タイル内の家計簿サマリー表示（Server Component）。
 * - 上段: 今月の支出合計、予算残り＆消化率プログレスバー（予算未設定時は収支バランス）
 * - 下段: ミニドーナツグラフ＆上位3カテゴリ凡例
 */
export default function FinanceTileContent({ summary }: FinanceTileContentProps) {
  const barColorClass = summary.isOverBudget
    ? "bg-rose-500"
    : (summary.budgetUsagePercent ?? 0) >= 80
      ? "bg-amber-500"
      : "bg-slate-800";

  const balanceColorClass =
    summary.balance > 0
      ? "text-emerald-700"
      : summary.balance < 0
        ? "text-rose-600"
        : "text-slate-700";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* 上段エリア: 今月の支出合計 ＆ 予算プログレスバー / 収支バランス */}
      <div className="shrink-0 space-y-2.5">
        <div>
          <p className="text-[11px] font-medium text-slate-400">今月の支出</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatYen(summary.totalExpense)}
          </p>
        </div>

        {summary.hasBudget && summary.budgetRemaining !== null ? (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-slate-500">
                予算残り{" "}
                <span
                  className={
                    summary.isOverBudget
                      ? "font-semibold text-rose-600 tabular-nums"
                      : "font-semibold text-slate-800 tabular-nums"
                  }
                >
                  {formatYen(summary.budgetRemaining)}
                </span>
              </span>
              <span
                className={
                  summary.isOverBudget
                    ? "shrink-0 text-[11px] font-semibold text-rose-600 tabular-nums"
                    : "shrink-0 text-[11px] text-slate-500 tabular-nums"
                }
              >
                {summary.budgetUsagePercent ?? 0}%
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={summary.progressBarPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="月間予算の消化率"
            >
              <div
                className={`h-full rounded-full transition-all ${barColorClass}`}
                style={{ width: `${summary.progressBarPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
            <span className="text-slate-500">収支バランス</span>
            <span className={`font-semibold tabular-nums ${balanceColorClass}`}>
              {formatSignedYen(summary.balance)}
            </span>
          </div>
        )}
      </div>

      {/* 下段エリア: ミニドーナツグラフ ＆ 上位カテゴリ凡例 */}
      <div className="flex min-h-0 flex-1 items-center gap-4 border-t border-slate-100 pt-3">
        <MiniDonutChart items={summary.allCategories} totalExpense={summary.totalExpense} />

        <div className="min-w-0 flex-1">
          {summary.hasExpenses ? (
            <div className="space-y-2">
              <ul className="space-y-1.5">
                {summary.topCategories.map((item) => (
                  <li
                    key={item.category}
                    className="flex items-center justify-between gap-1.5 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${getCategoryStyle(item.category).barClass}`}
                        aria-hidden="true"
                      />
                      <span className="truncate text-slate-700">{item.category}</span>
                    </span>
                    <span className="shrink-0 font-medium text-slate-500 tabular-nums">
                      {item.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
              {summary.otherCategoriesCount > 0 ? (
                <p className="text-[11px] text-slate-400">
                  他 {summary.otherCategoriesCount}件
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-slate-400">今月の支出データはまだありません</p>
          )}
        </div>
      </div>
    </div>
  );
}

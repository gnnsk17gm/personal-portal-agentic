"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import type { CategoryBreakdownItem } from "@/lib/finance";
import { formatYen, getCategoryStyle } from "@/lib/finance-constants";

interface CategoryBreakdownProps {
  month: string;
  items: CategoryBreakdownItem[];
  totalExpense: number;
  selectedCategory: string | null;
}

function buildCategoryHref(month: string, category: string | null): string {
  const params = new URLSearchParams({ month });
  if (category) {
    params.set("category", category);
  }
  return `/finance?${params.toString()}`;
}

const CHART_SIZE = 188;
const BASE_STROKE_WIDTH = 26;
const ACTIVE_STROKE_WIDTH = 30;
const RADIUS = (CHART_SIZE - ACTIVE_STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CategoryBreakdown({
  month,
  items,
  totalExpense,
  selectedCategory,
}: CategoryBreakdownProps) {
  const router = useRouter();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const highlightedCategory = hoveredCategory ?? selectedCategory;

  const segments = items.reduce<
    Array<{
      item: CategoryBreakdownItem;
      color: string;
      length: number;
      offset: number;
    }>
  >((acc, item) => {
    const prevEnd =
      acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    const ratio = totalExpense > 0 ? item.amount / totalExpense : 0;
    const length = ratio * CIRCUMFERENCE;
    acc.push({
      item,
      color: getCategoryStyle(item.category).strokeColor,
      length,
      offset: prevEnd,
    });
    return acc;
  }, []);

  const handleSegmentClick = (category: string) => {
    const nextCategory = selectedCategory === category ? null : category;
    router.push(buildCategoryHref(month, nextCategory), { scroll: false });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">カテゴリ別支出内訳</h2>
        {selectedCategory ? (
          <Link
            href={buildCategoryHref(month, null)}
            scroll={false}
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            <X size={12} aria-hidden="true" />
            フィルタ解除（{selectedCategory}）
          </Link>
        ) : (
          <span className="text-xs text-slate-400">クリックで明細を絞り込み</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          この月の支出データはまだありません
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          {/* 左側: SVG ドーナツグラフ */}
          <div className="relative flex shrink-0 items-center justify-center">
            <svg
              width={CHART_SIZE}
              height={CHART_SIZE}
              viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
              role="img"
              aria-label={`カテゴリ別支出内訳 合計 ${formatYen(totalExpense)}`}
              className="overflow-visible"
            >
              {/* 背景リング */}
              <circle
                cx={CHART_SIZE / 2}
                cy={CHART_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={BASE_STROKE_WIDTH}
              />

              {/* カテゴリ別セグメント（12時方向から時計回り） */}
              <g transform={`rotate(-90 ${CHART_SIZE / 2} ${CHART_SIZE / 2})`}>
                {segments.map(({ item, color, length, offset }) => {
                  const isActive = highlightedCategory === item.category;
                  const isDimmed =
                    highlightedCategory !== null && highlightedCategory !== item.category;

                  return (
                    <circle
                      key={item.category}
                      cx={CHART_SIZE / 2}
                      cy={CHART_SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      stroke={color}
                      strokeWidth={isActive ? ACTIVE_STROKE_WIDTH : BASE_STROKE_WIDTH}
                      strokeDasharray={`${length.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`}
                      strokeDashoffset={(-offset).toFixed(2)}
                      opacity={isDimmed ? 0.35 : 1}
                      aria-label={`${item.category}: ${formatYen(item.amount)} (${item.percentage}%)`}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredCategory(item.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => handleSegmentClick(item.category)}
                    />
                  );
                })}
              </g>
            </svg>

            {/* ドーナツ中央: 支出合計金額 */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <span className="text-[11px] font-medium text-slate-400">支出合計</span>
              <span className="mt-0.5 text-base font-bold tracking-tight text-slate-900 tabular-nums">
                {formatYen(totalExpense)}
              </span>
            </div>
          </div>

          {/* 右側: カテゴリ別凡例リスト */}
          <ul className="w-full flex-1 space-y-1.5">
            {items.map((item) => {
              const style = getCategoryStyle(item.category);
              const isSelected = selectedCategory === item.category;
              const isHighlighted = highlightedCategory === item.category;
              const nextHref = buildCategoryHref(month, isSelected ? null : item.category);

              return (
                <li key={item.category}>
                  <Link
                    href={nextHref}
                    scroll={false}
                    onMouseEnter={() => setHoveredCategory(item.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? "border-slate-900 bg-slate-50"
                        : isHighlighted
                          ? "border-slate-200 bg-slate-50"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: style.strokeColor }}
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium text-slate-800">{item.category}</span>
                      <span className="shrink-0 text-xs text-slate-400">{item.count}件</span>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-2.5">
                      <span className="font-semibold tabular-nums text-slate-900">
                        {formatYen(item.amount)}
                      </span>
                      <span className="w-9 text-right text-xs tabular-nums text-slate-500">
                        {item.percentage}%
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

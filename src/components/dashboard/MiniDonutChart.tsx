import type { CategoryBreakdownItem } from "@/lib/finance";
import { getCategoryStyle } from "@/lib/finance-constants";

interface MiniDonutChartProps {
  items: readonly CategoryBreakdownItem[];
  totalExpense: number;
}

const CHART_SIZE = 92;
const STROKE_WIDTH = 14;
const RADIUS = (CHART_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * ダッシュボード Finance タイル用の純粋 SVG ミニドーナツグラフ。
 * 支出 0 円時はグレーのプレースホルダーリングを表示する。
 */
export default function MiniDonutChart({ items, totalExpense }: MiniDonutChartProps) {
  const hasExpenses = totalExpense > 0 && items.length > 0;

  const segments = hasExpenses
    ? items.reduce<
        Array<{
          category: string;
          color: string;
          length: number;
          offset: number;
        }>
      >((acc, item) => {
        const prevEnd =
          acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
        const ratio = item.amount > 0 ? item.amount / totalExpense : 0;
        const length = ratio * CIRCUMFERENCE;
        acc.push({
          category: item.category,
          color: getCategoryStyle(item.category).strokeColor,
          length,
          offset: prevEnd,
        });
        return acc;
      }, [])
    : [];

  return (
    <svg
      width={CHART_SIZE}
      height={CHART_SIZE}
      viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
      role="img"
      aria-label={hasExpenses ? "カテゴリ別支出割合" : "支出データなし"}
      className="shrink-0"
    >
      {/* ベースリング（0円時はプレースホルダーとして機能） */}
      <circle
        cx={CHART_SIZE / 2}
        cy={CHART_SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={STROKE_WIDTH}
      />

      {hasExpenses ? (
        <g transform={`rotate(-90 ${CHART_SIZE / 2} ${CHART_SIZE / 2})`}>
          {segments.map((segment) => (
            <circle
              key={segment.category}
              cx={CHART_SIZE / 2}
              cy={CHART_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${segment.length} ${CIRCUMFERENCE}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}

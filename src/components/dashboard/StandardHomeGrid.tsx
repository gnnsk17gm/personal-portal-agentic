import { Calendar, ListChecks, NotebookPen, StickyNote, Wallet } from "lucide-react";
import CaptureForm from "@/components/dashboard/CaptureForm";
import { TileInteractiveArea } from "@/components/dashboard/DashboardTile";
import EditableTileGrid, {
  type TileSlotItem,
} from "@/components/dashboard/EditableTileGrid";
import FinanceTileContent from "@/components/dashboard/FinanceTileContent";
import QuickScratchpad from "@/components/dashboard/QuickScratchpad";
import TaskCheckbox from "@/components/dashboard/TaskCheckbox";
import type { DashboardTileId } from "@/lib/dashboardTiles";
import { getDashboardTiles } from "@/lib/dashboardTilesServer";
import {
  ensureRecurringTransactionsForMonth,
  getCurrentMonth,
  getMonthlyFinanceOverview,
} from "@/lib/finance";
import { buildFinanceTileSummary } from "@/lib/financeTileSummary";
import { getRecentCaptures } from "@/services/captureService";
import { getAllTasks } from "@/services/taskService";
import type { TaskPreview } from "@/types/portal";

const PRIORITY_DOT: Record<TaskPreview["priority"], string> = {
  high: "bg-rose-500",
  medium: "bg-amber-400",
  low: "bg-slate-300",
};

/** Asia/Tokyo 基準の YYYY-MM-DD 文字列を返す。 */
function getTodayDateString(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${d}`;
}

export default async function StandardHomeGrid() {
  const initialTiles = await getDashboardTiles();

  const allTasks = getAllTasks();
  const activeTasks = allTasks.filter((t) => t.status !== "done");
  const visibleTasks = activeTasks.slice(0, 5);

  const todayStr = getTodayDateString();
  const todayTasks = activeTasks.filter((t) => t.dueDate === todayStr);

  const recentNotes = getRecentCaptures(2);

  // 当月固定費のオンデマンド自動計上を実行した上で、ダッシュボード用家計簿サマリーを取得する
  const currentMonth = getCurrentMonth();
  ensureRecurringTransactionsForMonth(currentMonth);
  const financeOverview = getMonthlyFinanceOverview(currentMonth);
  const financeSummary = buildFinanceTileSummary({
    summary: financeOverview.summary,
    categoryBreakdown: financeOverview.categoryBreakdown,
  });

  const tileSlots: Record<DashboardTileId, TileSlotItem> = {
    tasks: {
      id: "tasks",
      href: "/tasks",
      title: "Tasks",
      icon: <ListChecks size={18} className="shrink-0 text-slate-700" aria-hidden="true" />,
      badge: (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {activeTasks.length}
        </span>
      ),
      content: (
        <>
          {visibleTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">未完了のタスクはありません</p>
          ) : (
            <ul className="space-y-2.5">
              {visibleTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2.5">
                  <TileInteractiveArea className="shrink-0">
                    <TaskCheckbox id={task.id} title={task.title} done={false} />
                  </TileInteractiveArea>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">{task.title}</p>
                    {task.dueDate ? (
                      <span className="text-xs text-slate-400">期限: {task.dueDate}</span>
                    ) : null}
                  </div>
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`}
                    title={`優先度: ${task.priority}`}
                    aria-label={`優先度 ${task.priority}`}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-400">
            {activeTasks.length > visibleTasks.length
              ? `他 ${activeTasks.length - visibleTasks.length} 件の未完了タスク`
              : "タイルをクリックしてすべて表示"}
          </p>
        </>
      ),
    },
    notes: {
      id: "notes",
      href: "/notes",
      title: "Notes",
      icon: <StickyNote size={18} className="shrink-0 text-slate-700" aria-hidden="true" />,
      content: (
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
          <TileInteractiveArea>
            <CaptureForm inputId="tile-quick-capture" rows={3} compact />
          </TileInteractiveArea>
          {recentNotes.length > 0 ? (
            <div className="border-t border-slate-100 pt-2.5">
              <p className="mb-1.5 text-[11px] font-medium text-slate-400">最近のメモ</p>
              <ul className="space-y-1.5">
                {recentNotes.map((note) => (
                  <li
                    key={note.id}
                    className="truncate rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
                  >
                    {note.content}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-400">メモはまだありません</p>
          )}
        </div>
      ),
    },
    schedule: {
      id: "schedule",
      href: "/tasks",
      title: "Today's Schedule",
      icon: <Calendar size={18} className="shrink-0 text-slate-700" aria-hidden="true" />,
      badge: (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {todayTasks.length}
        </span>
      ),
      content: (
        <>
          {todayTasks.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-slate-500">本日の予定はありません</p>
              <p className="mt-1 text-xs text-slate-400">{todayStr}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {todayTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="truncate text-sm text-slate-800">{task.title}</span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`}
                    title={`優先度: ${task.priority}`}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-400">今日（{todayStr}）が期限のタスク</p>
        </>
      ),
    },
    memo_pad: {
      id: "memo_pad",
      href: "/notes",
      title: "Quick Scratchpad",
      icon: <NotebookPen size={18} className="shrink-0 text-amber-600" aria-hidden="true" />,
      content: (
        <TileInteractiveArea className="flex min-h-0 flex-1 flex-col">
          <QuickScratchpad />
        </TileInteractiveArea>
      ),
    },
    finance: {
      id: "finance",
      href: "/finance",
      title: "Finance",
      icon: <Wallet size={18} className="shrink-0 text-slate-700" aria-hidden="true" />,
      badge: (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 tabular-nums">
          {financeSummary.month}
        </span>
      ),
      content: <FinanceTileContent summary={financeSummary} />,
    },
  };

  return <EditableTileGrid initialTiles={initialTiles} tileSlots={tileSlots} />;
}

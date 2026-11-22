import { Calendar, ListChecks, StickyNote } from "lucide-react";
import CaptureForm from "@/components/dashboard/CaptureForm";
import DashboardTile, { TileInteractiveArea } from "@/components/dashboard/DashboardTile";
import TaskCheckbox from "@/components/dashboard/TaskCheckbox";
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

export default function StandardHomeGrid() {
  const allTasks = getAllTasks();
  const activeTasks = allTasks.filter((t) => t.status !== "done");
  const visibleTasks = activeTasks.slice(0, 5);

  const todayStr = getTodayDateString();
  const todayTasks = activeTasks.filter((t) => t.dueDate === todayStr);

  const recentNotes = getRecentCaptures(2);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {/* 1. Tasks タイル */}
      <DashboardTile
        href="/tasks"
        title="Tasks"
        icon={<ListChecks size={18} className="shrink-0 text-slate-700" aria-hidden="true" />}
        badge={
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {activeTasks.length}
          </span>
        }
      >
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
      </DashboardTile>

      {/* 2. Notes タイル */}
      <DashboardTile
        href="/notes"
        title="Notes"
        icon={<StickyNote size={18} className="shrink-0 text-slate-700" aria-hidden="true" />}
      >
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
      </DashboardTile>

      {/* 3. Today's Schedule タイル */}
      <DashboardTile
        href="/tasks"
        title="Today's Schedule"
        icon={<Calendar size={18} className="shrink-0 text-slate-700" aria-hidden="true" />}
        badge={
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {todayTasks.length}
          </span>
        }
      >
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
      </DashboardTile>
    </div>
  );
}

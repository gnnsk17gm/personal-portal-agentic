import { ListChecks, Paperclip } from "lucide-react";
import TaskCheckbox from "@/components/dashboard/TaskCheckbox";
import { assembleContext } from "@/services/contextAssemblerService";
import { getPriorityTasks } from "@/services/taskService";
import type { TaskPreview } from "@/types/portal";

const PRIORITY_STYLES: Record<TaskPreview["priority"], string> = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function PriorityTasksCard() {
  const tasks = getPriorityTasks();
  const context = assembleContext();

  const noteCountMap = new Map<number, number>();
  for (const enriched of context.enrichedTasks) {
    if (enriched.relevantNotes && enriched.relevantNotes.length > 0) {
      noteCountMap.set(enriched.id, enriched.relevantNotes.length);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
        <ListChecks size={18} className="text-indigo-500" aria-hidden="true" />
        Priority Tasks
      </h2>
      <ul className="space-y-3">
        {tasks.map((task) => {
          const done = task.status === "done";
          const noteCount = noteCountMap.get(task.id) ?? 0;
          return (
            <li key={task.id} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <TaskCheckbox id={task.id} title={task.title} done={done} />
                <div className={done ? "opacity-60" : undefined}>
                  <p className={`text-sm font-medium text-slate-900 ${done ? "line-through" : ""}`}>
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {task.dueDate ? <span className="text-xs text-slate-500">期限: {task.dueDate}</span> : null}
                    {noteCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200">
                        <Paperclip size={11} className="text-indigo-500" aria-hidden="true" />
                        関連メモ {noteCount}件
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${PRIORITY_STYLES[task.priority]}`}
              >
                {task.priority}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}


import { ListChecks } from "lucide-react";
import type { TaskPreview } from "@/types/portal";

const DUMMY_TASKS: TaskPreview[] = [
  { id: "1", title: "Spec 001 の実装を完了する", priority: "high", status: "in_progress", dueDate: "今日" },
  { id: "2", title: "次の仕様書（タスク管理）を起草", priority: "medium", status: "todo", dueDate: "明日" },
  { id: "3", title: "README を更新", priority: "low", status: "todo" },
];

const PRIORITY_STYLES: Record<TaskPreview["priority"], string> = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function PriorityTasksCard() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
        <ListChecks size={18} className="text-indigo-500" aria-hidden="true" />
        Priority Tasks
      </h2>
      <ul className="space-y-3">
        {DUMMY_TASKS.map((task) => (
          <li key={task.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{task.title}</p>
              {task.dueDate ? (
                <p className="text-xs text-slate-500">期限: {task.dueDate}</p>
              ) : null}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${PRIORITY_STYLES[task.priority]}`}
            >
              {task.priority}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

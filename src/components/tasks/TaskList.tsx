import TaskCheckbox from "@/components/dashboard/TaskCheckbox";
import TaskDeleteButton from "@/components/tasks/TaskDeleteButton";
import type { TaskPreview } from "@/types/portal";

const PRIORITY_STYLES: Record<TaskPreview["priority"], string> = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function TaskList({ tasks }: { tasks: TaskPreview[] }) {
  if (tasks.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">該当するタスクはありません</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((task) => {
        const done = task.status === "done";
        return (
          <li key={task.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-start gap-3">
              <TaskCheckbox id={task.id} title={task.title} done={done} />
              <div className={done ? "opacity-60" : undefined}>
                <p className={`text-sm font-medium text-slate-900 ${done ? "line-through" : ""}`}>{task.title}</p>
                {task.dueDate ? <p className="text-xs text-slate-500">期限: {task.dueDate}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${PRIORITY_STYLES[task.priority]}`}
              >
                {task.priority}
              </span>
              <TaskDeleteButton id={task.id} title={task.title} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

import GoalDecompositionForm from "@/components/agent/GoalDecompositionForm";
import AgentRunTimeline from "@/components/agent/AgentRunTimeline";
import TaskCreateForm from "@/components/tasks/TaskCreateForm";
import TaskFilterTabs, { type TaskFilter } from "@/components/tasks/TaskFilterTabs";
import TaskList from "@/components/tasks/TaskList";
import { getPortalMode } from "@/lib/portalModeServer";
import { getAllTasks } from "@/services/taskService";
import { getRecentRuns, getRunSteps } from "@/services/taskDecomposerService";

export const dynamic = "force-dynamic";

function parseFilter(value: string | string[] | undefined): TaskFilter {
  return value === "active" || value === "done" ? value : "all";
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [params, mode] = await Promise.all([searchParams, getPortalMode()]);
  const filter = parseFilter(params.filter);
  const all = getAllTasks();
  const tasks = all.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.status === "done" : t.status !== "done",
  );

  const isPortfolio = mode === "portfolio";
  const runsWithSteps = isPortfolio
    ? getRecentRuns(5).map((run) => ({
        run,
        steps: getRunSteps(run.id),
      }))
    : [];

  return (
    <div className="space-y-6">
      {isPortfolio ? <GoalDecompositionForm /> : null}
      <TaskCreateForm />
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">タスク一覧（{tasks.length}件）</h2>
          <TaskFilterTabs current={filter} />
        </div>
        <TaskList tasks={tasks} />
      </section>
      {isPortfolio ? <AgentRunTimeline runsWithSteps={runsWithSteps} /> : null}
    </div>
  );
}


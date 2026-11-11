import { Bot, CheckCircle2, AlertCircle, Clock, ChevronDown } from "lucide-react";
import type { AgentRole, AgentRunPreview, AgentStepPreview } from "@/types/portal";

export interface AgentRunTimelineProps {
  runsWithSteps: {
    run: AgentRunPreview;
    steps: AgentStepPreview[];
  }[];
}

function getRoleBadge(role: AgentRole) {
  switch (role) {
    case "researcher":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20">
          <span>🔍</span> Researcher
        </span>
      );
    case "planner":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20">
          <span>📐</span> Planner
        </span>
      );
    case "critic":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
          <span>⚖️</span> Critic
        </span>
      );
    case "orchestrator":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-500/20">
          <span>🚀</span> Orchestrator
        </span>
      );
  }
}

function getStatusBadge(status: AgentRunPreview["status"]) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      );
    case "running":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
          <Clock className="h-3 w-3 animate-spin" />
          Running
        </span>
      );
  }
}

export default function AgentRunTimeline({ runsWithSteps }: AgentRunTimelineProps) {
  if (runsWithSteps.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Agent Execution Traces（思考・実行ログ）
          </h3>
        </div>
        <span className="text-xs text-slate-400">直近 {runsWithSteps.length} 件の実行</span>
      </div>

      <div className="space-y-3">
        {runsWithSteps.map(({ run, steps }, idx) => (
          <details
            key={run.id}
            open={idx === 0}
            className="group rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 transition-colors hover:border-slate-300"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                <span className="font-mono text-xs font-semibold text-slate-500">#{run.id}</span>
                <span className="truncate font-medium text-slate-800" title={run.goal}>
                  {run.goal}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400">
                  {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {getStatusBadge(run.status)}
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
              </div>
            </summary>

            <div className="mt-3 border-t border-slate-200/60 pt-3">
              <ol className="relative ml-2 space-y-2.5 border-l border-slate-200 pl-4 text-xs">
                {steps.map((step) => {
                  const isSuccess = step.status === "success";
                  return (
                    <li key={step.id} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                          isSuccess ? "bg-indigo-600" : "bg-rose-500"
                        }`}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {getRoleBadge(step.agentRole)}
                          <span className="font-mono font-medium text-slate-700">
                            {step.stepName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(step.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 leading-relaxed font-sans">
                        {step.detail}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}



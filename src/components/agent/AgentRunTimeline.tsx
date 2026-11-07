import { Bot, CheckCircle2, AlertCircle, Clock, ChevronDown } from "lucide-react";
import type { AgentRunPreview, AgentStepPreview } from "@/types/portal";

export interface AgentRunTimelineProps {
  runsWithSteps: {
    run: AgentRunPreview;
    steps: AgentStepPreview[];
  }[];
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
              <ol className="relative ml-2 space-y-2 border-l border-slate-200 pl-4 text-xs">
                {steps.map((step) => {
                  const isSuccess = step.status === "success";
                  return (
                    <li key={step.id} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                          isSuccess ? "bg-indigo-600" : "bg-rose-500"
                        }`}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-medium text-slate-700">
                          {step.stepName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(step.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-600 leading-relaxed font-sans">
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


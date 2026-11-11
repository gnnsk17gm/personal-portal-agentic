"use client";

import { useState, useTransition } from "react";
import { Play, Sparkles, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { runScenarioAction } from "@/app/actions";

export default function ScenarioSimulatorButton() {
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleRunScenario = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await runScenarioAction();
      if (res.ok && res.result) {
        setStatusMessage({
          type: "success",
          text: `デモ障害タスク ${res.result.injectedCount} 件を注入し、Task Doctor（${res.result.sweepStatus}）と是正プラン（${res.result.remediationPlanCount}件）をセットアップしました`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error ?? "シナリオの実行に失敗しました",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleRunScenario}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>自律シナリオ実行中...</span>
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5 fill-current" />
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Run Incident Demo Scenario</span>
          </>
        )}
      </button>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
              : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}

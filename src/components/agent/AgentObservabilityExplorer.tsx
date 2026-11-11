"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import type {
  AgentRole,
  AgentRunPreview,
  AgentRunStatus,
  AgentStepPreview,
  AgentSystemMetrics,
} from "@/types/portal";
import ScenarioSimulatorButton from "./ScenarioSimulatorButton";

export interface AgentObservabilityExplorerProps {
  metrics: AgentSystemMetrics;
  runsWithSteps: {
    run: AgentRunPreview;
    steps: AgentStepPreview[];
  }[];
}

type FilterType = "all" | "completed" | "failed";

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

function getStatusBadge(status: AgentRunStatus) {
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

export default function AgentObservabilityExplorer({
  metrics,
  runsWithSteps,
}: AgentObservabilityExplorerProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredRuns = useMemo(() => {
    if (filter === "all") return runsWithSteps;
    return runsWithSteps.filter((item) => item.run.status === filter);
  }, [runsWithSteps, filter]);

  // 直近7日の最大カウント（グラフのスケール用）
  const maxDailyCount = useMemo(() => {
    const counts = metrics.recentActivity.map((a) => a.count);
    return Math.max(...counts, 1);
  }, [metrics.recentActivity]);

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* 統合ヘッダー */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Agent Observability Explorer
              </h2>
              <p className="text-xs text-slate-500">
                エージェント自律サイクルの全実行トレースと稼働メトリクスを監査・分析
              </p>
            </div>
          </div>
        </div>
        <ScenarioSimulatorButton />
      </div>

      {/* KPI 統計カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Runs */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Runs</span>
            <Bot className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {metrics.totalRuns}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
            <span>完了: {metrics.completedRuns}</span>
            <span>・</span>
            <span>失敗: {metrics.failedRuns}</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Success Rate</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {metrics.successRate}%
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${metrics.successRate}%` }}
            />
          </div>
        </div>

        {/* Active Subagents */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Subagents</span>
            <Cpu className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {metrics.activeSubagents}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            現在稼働中 (Running) のエージェント
          </p>
        </div>

        {/* Roles Breakdown */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Role Breakdown</span>
            <Layers className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
            <span className="text-slate-600">
              🔍 調査: <strong>{metrics.roleBreakdown.researcher}</strong>
            </span>
            <span className="text-slate-600">
              📐 計画: <strong>{metrics.roleBreakdown.planner}</strong>
            </span>
            <span className="text-slate-600">
              ⚖️ 批評: <strong>{metrics.roleBreakdown.critic}</strong>
            </span>
            <span className="text-slate-600">
              🚀 統括: <strong>{metrics.roleBreakdown.orchestrator}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 直近7日間のアクティビティ推移ミニチャート */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            直近 7 日間の自律実行アクティビティ推移
          </span>
          <span className="text-[11px] text-slate-400">日付別実行数</span>
        </div>
        <div className="grid grid-cols-7 gap-2 items-end h-16 pt-2">
          {metrics.recentActivity.map((day) => {
            const heightPercent =
              maxDailyCount > 0 ? Math.round((day.count / maxDailyCount) * 100) : 0;
            const shortDate = day.date.slice(5); // MM-DD
            return (
              <div key={day.date} className="flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[10px] font-semibold text-slate-600">
                  {day.count > 0 ? day.count : ""}
                </span>
                <div className="w-full bg-slate-200/60 rounded-t h-8 flex items-end">
                  <div
                    className="w-full bg-indigo-500 rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(heightPercent, day.count > 0 ? 15 : 0)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-400">{shortDate}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* フィルタタブ & 実行ログ一覧 */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({runsWithSteps.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("completed")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === "completed"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Completed ({metrics.completedRuns})
            </button>
            <button
              type="button"
              onClick={() => setFilter("failed")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === "failed"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Failed ({metrics.failedRuns})
            </button>
          </div>
          <span className="text-xs text-slate-400">表示中: {filteredRuns.length} 件</span>
        </div>

        {filteredRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <Compass className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">
              該当するエージェント実行ログはありません
            </p>
            <p className="mt-1 text-xs text-slate-400">
              右上の「Run Incident Demo Scenario」から自律実行を体験できます
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRuns.map(({ run, steps }, idx) => (
              <details
                key={run.id}
                open={idx === 0}
                className="group rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition-colors hover:border-slate-300"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                  <div className="flex flex-1 items-center gap-2 overflow-hidden">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{run.id}
                    </span>
                    <span className="truncate font-semibold text-slate-800" title={run.goal}>
                      {run.goal}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400">
                      {steps.length} steps
                    </span>
                    {getStatusBadge(run.status)}
                    <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">
                      {new Date(run.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                {/* ステップ詳細 */}
                <div className="mt-3.5 border-t border-slate-200/60 pt-3">
                  {steps.length === 0 ? (
                    <p className="text-xs text-slate-400">記録されたステップはありません</p>
                  ) : (
                    <ol className="relative ml-2 space-y-3 border-l border-slate-200 pl-4">
                      {steps.map((step) => (
                        <li key={step.id} className="relative">
                          <span
                            className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                              step.status === "success" ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            {getRoleBadge(step.agentRole)}
                            <span className="font-mono text-xs font-semibold text-slate-700">
                              {step.stepName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {new Date(step.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600 bg-white/70 rounded p-2 border border-slate-100 font-mono">
                            {step.detail}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


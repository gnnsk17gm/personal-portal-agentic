import { Activity, AlertCircle, AlertTriangle, CheckCircle2, Wrench, ArrowRight } from 'lucide-react';
import { getLatestSweepReport } from '@/services/sweeperService';
import { generateRemediationPlan } from '@/services/remediationService';
import RunHealthCheckButton from './RunHealthCheckButton';
import ApplyRemediationButton from './ApplyRemediationButton';
import type { HealthStatus } from '@/types/portal';

const STATUS_CONFIG: Record<
  HealthStatus,
  { label: string; badgeClass: string; icon: typeof CheckCircle2 }
> = {
  healthy: {
    label: 'Healthy',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-200',
    icon: CheckCircle2,
  },
  warning: {
    label: 'Warning',
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200 border-amber-200',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Critical',
    badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200 border-rose-200',
    icon: AlertCircle,
  },
};

export default function SystemHealthCard() {
  const report = getLatestSweepReport();
  const remediationPlan = report && report.status !== 'healthy' ? generateRemediationPlan() : null;
  const showRemediation = Boolean(
    report && report.status !== 'healthy' && remediationPlan && remediationPlan.actions.length > 0
  );

  return (
    <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Activity size={18} className="text-indigo-600" aria-hidden="true" />
            System Health & Task Doctor
          </h2>
          <div className="flex items-center gap-2">
            <RunHealthCheckButton />
          </div>
        </div>

        {report ? (
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {(() => {
                  const config = STATUS_CONFIG[report.status];
                  const Icon = config.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}
                    >
                      <Icon size={13} aria-hidden="true" />
                      {config.label}
                    </span>
                  );
                })()}
                <span className="text-xs text-slate-500">
                  {report.summary}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                最終スキャン: {new Date(report.sweptAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                <div className="text-slate-400 text-[10px]">期限切れ</div>
                <div className={`text-sm font-semibold ${report.overdueTasksCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {report.overdueTasksCount}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                <div className="text-slate-400 text-[10px]">重要未完了</div>
                <div className="text-sm font-semibold text-slate-700">
                  {report.highPriorityPendingCount}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                <div className="text-slate-400 text-[10px]">全未完了</div>
                <div className="text-sm font-semibold text-slate-700">
                  {report.totalPendingCount}
                </div>
              </div>
            </div>

            {/* AI是正提案（Remediation Plan）セクション */}
            {showRemediation && remediationPlan && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                    <Wrench size={14} className="text-indigo-600" aria-hidden="true" />
                    AI 是正提案（Self-Healing Proposal）
                  </div>
                  <ApplyRemediationButton actionCount={remediationPlan.actions.length} />
                </div>
                <p className="mb-2 text-[11px] text-indigo-700/80">
                  以下のタスクに対して、エージェントが自律的に是正プランを策定しました。ワンクリックで安全に適用できます。
                </p>
                <div className="space-y-1.5">
                  {remediationPlan.actions.map((act, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-1 rounded-md border border-indigo-100/70 bg-white p-2 text-slate-700 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900 truncate">
                          {act.taskTitle}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {act.reason}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs shrink-0 self-start sm:self-center font-mono">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 line-through">
                          {act.currentValue ?? 'none'}
                        </span>
                        <ArrowRight size={12} className="text-indigo-500" aria-hidden="true" />
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 border border-indigo-200">
                          {act.proposedValue}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.recommendations.length > 0 && !showRemediation && (
              <div className="rounded-lg bg-slate-50/80 p-2.5 text-xs border border-slate-100">
                <div className="font-medium text-slate-700 mb-1.5">改善推奨アクション:</div>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {report.recommendations.map((rec, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            <p className="mb-2">まだ自律巡回診断の履歴がありません。</p>
            <p className="text-slate-400">「Run Health Check」をクリックして即時診断を実行できます。</p>
          </div>
        )}
      </div>
    </section>
  );
}


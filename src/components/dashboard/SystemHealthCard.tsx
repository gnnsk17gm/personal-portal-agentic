import { Activity, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getLatestSweepReport } from '@/services/sweeperService';
import RunHealthCheckButton from './RunHealthCheckButton';
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

  return (
    <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Activity size={18} className="text-indigo-600" aria-hidden="true" />
            System Health & Task Doctor
          </h2>
          <RunHealthCheckButton />
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

            {report.recommendations.length > 0 && (
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


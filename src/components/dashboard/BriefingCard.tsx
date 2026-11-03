import { Bot, Calendar, ChevronDown, Clock, Sun } from 'lucide-react';
import { assembleContext } from '@/services/contextAssemblerService';
import type { ScheduleEvent } from '@/types/portal';

const CATEGORY_STYLES: Record<ScheduleEvent['category'], string> = {
  meeting: 'bg-blue-50 text-blue-700 ring-blue-200',
  focus: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  personal: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const CATEGORY_LABELS: Record<ScheduleEvent['category'], string> = {
  meeting: 'MTG',
  focus: 'Focus',
  personal: 'Personal',
};

export default function BriefingCard() {
  const context = assembleContext();

  return (
    <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sun size={18} className="text-amber-500" aria-hidden="true" />
            Morning Briefing
          </h2>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              未完了 {context.stats.pendingTasksCount}
            </span>
            {context.stats.highPriorityCount > 0 ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700 ring-1 ring-rose-200">
                高優先 {context.stats.highPriorityCount}
              </span>
            ) : null}
          </div>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          {context.summaryText}
        </p>

        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Calendar size={14} aria-hidden="true" />
            本日の予定 ({context.todayEvents.length})
          </div>
          {context.todayEvents.length === 0 ? (
            <p className="text-xs text-slate-500">本日の予定はありません。</p>
          ) : (
            <ul className="space-y-2">
              {context.todayEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-slate-500">
                      <Clock size={13} aria-hidden="true" />
                      {event.time}
                    </span>
                    <span className="truncate text-slate-800">{event.title}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${CATEGORY_STYLES[event.category]}`}
                  >
                    {CATEGORY_LABELS[event.category]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <details className="group border-t border-slate-100 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-slate-500 hover:text-slate-800">
          <span className="flex items-center gap-1.5 font-medium">
            <Bot size={14} className="text-indigo-500" aria-hidden="true" />
            AI Context Payload Preview
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-indigo-700">
              ~{context.estimatedTokens} tokens
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {context.charCount} chars
            </span>
            {context.truncated ? (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                Truncated
              </span>
            ) : null}
            <ChevronDown
              size={14}
              className="transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </div>
        </summary>
        <div className="mt-3">
          <div className="mb-1 text-[11px] text-slate-400">
            エージェントプロンプトに動的注入される構造化コンテキスト：
          </div>
          <pre className="max-h-60 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
            {context.markdownPayload}
          </pre>
        </div>
      </details>
    </section>
  );
}

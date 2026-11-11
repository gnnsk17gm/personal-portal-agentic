'use client';

import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { runHealthSweepAction } from '@/app/actions';

export default function RunHealthCheckButton() {
  const [isPending, startTransition] = useTransition();

  const handleRun = () => {
    startTransition(async () => {
      await runHealthSweepAction();
    });
  };

  return (
    <button
      type="button"
      onClick={handleRun}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RefreshCw
        size={13}
        className={isPending ? 'animate-spin text-indigo-600' : 'text-slate-500'}
        aria-hidden="true"
      />
      <span>{isPending ? '診断中...' : 'Run Health Check'}</span>
    </button>
  );
}


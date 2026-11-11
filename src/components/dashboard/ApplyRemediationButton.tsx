'use client';

import { useState, useTransition } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { applyRemediationAction } from '@/app/actions';

interface ApplyRemediationButtonProps {
  actionCount: number;
}

export default function ApplyRemediationButton({ actionCount }: ApplyRemediationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApply = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await applyRemediationAction();
      if (!res.ok && res.error) {
        setErrorMessage(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleApply}
        disabled={isPending || actionCount === 0}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin text-white" aria-hidden="true" />
        ) : (
          <Sparkles size={13} className="text-amber-300" aria-hidden="true" />
        )}
        <span>{isPending ? '是正適用中...' : '✨ Apply Remediation'}</span>
      </button>
      {errorMessage && (
        <span className="text-[11px] text-rose-600">{errorMessage}</span>
      )}
    </div>
  );
}


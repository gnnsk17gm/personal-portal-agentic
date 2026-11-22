"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveCaptureAction, type CaptureState } from "@/app/actions";

const INITIAL_STATE: CaptureState = { ok: false, error: null, nonce: 0 };

interface CaptureFormProps {
  inputId?: string;
  rows?: number;
  compact?: boolean;
}

export default function CaptureForm({
  inputId = "quick-capture",
  rows = 5,
  compact = false,
}: CaptureFormProps = {}) {
  const [state, formAction, pending] = useActionState(saveCaptureAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <label htmlFor={inputId} className="sr-only">
        クイックメモ
      </label>
      <textarea
        id={inputId}
        name="content"
        rows={rows}
        placeholder="思いついたことをメモ..."
        className={`w-full resize-none rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
          compact ? "p-2.5" : "p-3"
        }`}
      />
      <div className={`${compact ? "mt-2" : "mt-3"} flex items-center justify-between gap-3`}>
        <p role="alert" className="text-xs text-rose-600">
          {state.error}
        </p>
        <button
          type="submit"
          disabled={pending}
          className={`rounded-lg bg-slate-900 font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50 ${
            compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
          }`}
        >
          {pending ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { createNoteAction, type CaptureState } from "@/app/actions";

const INITIAL_STATE: CaptureState = { ok: false, error: null, nonce: 0 };

export default function NoteCreateForm() {
  const [state, formAction, pending] = useActionState(createNoteAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-3 text-base font-semibold text-slate-900">新しいノート</h2>
      <label htmlFor="note-content" className="sr-only">
        ノート本文
      </label>
      <textarea
        id="note-content"
        name="content"
        rows={6}
        placeholder="技術ノート・学習記録など、長文もOK..."
        className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p role="alert" className="min-h-4 text-xs text-rose-600">
          {state.error}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}

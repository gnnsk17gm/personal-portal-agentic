"use client";

import { useActionState, useEffect, useRef } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { decomposeGoalAction, type DecomposeFormState } from "@/app/actions";

const INITIAL_STATE: DecomposeFormState = {
  ok: false,
  error: null,
  createdCount: 0,
  nonce: 0,
};

const FIELD =
  "flex-1 rounded-lg border border-indigo-200 bg-indigo-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all";

export default function GoalDecompositionForm() {
  const [state, formAction, pending] = useActionState(decomposeGoalAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Goal Decomposition Agent（目標自動分解）
            </h2>
            <p className="text-xs text-slate-500">
              抽象的な目標からSecond Brainのナレッジを参照し、期日・優先度付きタスクへ自律分解します
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="goal-input" className="sr-only">
          目標
        </label>
        <input
          id="goal-input"
          name="goal"
          type="text"
          required
          disabled={pending}
          placeholder="例: 転職用の職歴書とポートフォリオを整備する"
          className={FIELD}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>推論・分解中...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>タスク自動分解</span>
            </>
          )}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
          {state.error}
        </p>
      )}

      {state.ok && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>エージェントが目標を分解し、{state.createdCount}件のタスクを自動登録しました。</span>
        </div>
      )}
    </form>
  );
}


"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTaskAction, type TaskFormState } from "@/app/actions";

const INITIAL_STATE: TaskFormState = { ok: false, error: null, nonce: 0 };

const FIELD =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export default function TaskCreateForm() {
  const [state, formAction, pending] = useActionState(createTaskAction, INITIAL_STATE);
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
      <h2 className="mb-4 text-base font-semibold text-slate-900">新しいタスク</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="task-title" className="text-xs font-medium text-slate-600">
            タイトル（必須）
          </label>
          <input id="task-title" name="title" type="text" required placeholder="やることを入力..." className={FIELD} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="task-priority" className="text-xs font-medium text-slate-600">
            優先度
          </label>
          <select id="task-priority" name="priority" defaultValue="medium" className={FIELD}>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="task-due" className="text-xs font-medium text-slate-600">
            期限日（任意）
          </label>
          <input id="task-due" name="dueDate" type="date" className={FIELD} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "追加中..." : "追加"}
        </button>
      </div>
      <p role="alert" className="mt-2 min-h-4 text-xs text-rose-600">
        {state.error}
      </p>
    </form>
  );
}

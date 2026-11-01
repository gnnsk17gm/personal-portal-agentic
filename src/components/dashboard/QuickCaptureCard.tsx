import { PencilLine } from "lucide-react";

export default function QuickCaptureCard() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
        <PencilLine size={18} className="text-emerald-500" aria-hidden="true" />
        Quick Capture
      </h2>
      <label htmlFor="quick-capture" className="sr-only">
        クイックメモ
      </label>
      <textarea
        id="quick-capture"
        rows={5}
        placeholder="思いついたことをメモ..."
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          保存
        </button>
      </div>
    </section>
  );
}

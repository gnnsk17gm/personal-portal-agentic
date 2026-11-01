import { PencilLine } from "lucide-react";
import CaptureForm from "@/components/dashboard/CaptureForm";
import { getRecentCaptures } from "@/services/captureService";

export default function QuickCaptureCard() {
  const recent = getRecentCaptures(3);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
        <PencilLine size={18} className="text-emerald-500" aria-hidden="true" />
        Quick Capture
      </h2>
      <CaptureForm />
      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="mb-2 text-xs font-semibold text-slate-500">直近のメモ</h3>
        {recent.length === 0 ? (
          <p className="text-xs text-slate-400">まだメモはありません</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-50 p-2 text-sm text-slate-800">
                <p className="whitespace-pre-wrap break-words">{c.content}</p>
                <time dateTime={c.createdAt} className="text-xs text-slate-400">
                  {new Date(c.createdAt).toLocaleString("ja-JP")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

import { Sun } from "lucide-react";

const SCHEDULE = [
  { time: "10:00", text: "週次プランニング" },
  { time: "13:30", text: "ポートフォリオ実装（Spec 001）" },
  { time: "17:00", text: "振り返りとログ整理" },
];

export default function BriefingCard() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
        <Sun size={18} className="text-amber-500" aria-hidden="true" />
        Morning Briefing
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        今日の優先事項：ダッシュボード骨格の完成とタスク整理。
      </p>
      <ul className="space-y-2">
        {SCHEDULE.map((s) => (
          <li key={s.time} className="flex gap-3 text-sm">
            <span className="w-12 shrink-0 font-mono text-slate-500">{s.time}</span>
            <span className="text-slate-900">{s.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

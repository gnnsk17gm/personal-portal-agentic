import { getSettingsSummary } from "@/services/agentContextService";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettingsSummary();
  const rows: { label: string; value: string }[] = [
    { label: "Database", value: s.database },
    { label: "Test Runner", value: s.testRunner },
    { label: "Node.js", value: s.nodeVersion },
    { label: "SDD Status (Active)", value: `${s.activeSpecs} 件` },
    { label: "SDD Status (Completed)", value: `${s.completedSpecs} 件` },
  ];
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">システム構成</h2>
      <dl className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm text-slate-500">{row.label}</dt>
            <dd className="text-sm font-medium text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

import Link from "next/link";

export type TaskFilter = "all" | "active" | "done";

const TABS: { id: TaskFilter; label: string; href: string }[] = [
  { id: "all", label: "すべて", href: "/tasks" },
  { id: "active", label: "未完了", href: "/tasks?filter=active" },
  { id: "done", label: "完了済み", href: "/tasks?filter=done" },
];

export default function TaskFilterTabs({ current }: { current: TaskFilter }) {
  return (
    <nav aria-label="タスクフィルタ" className="flex gap-1 rounded-lg bg-slate-100 p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === current ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab.id === current ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

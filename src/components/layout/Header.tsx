"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks & Projects",
  "/notes": "Second Brain",
  "/agent": "Agent Status & Logs",
  "/settings": "Settings",
};

function formatToday(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

export default function Header() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Personal Portal";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-4">
        <time className="text-sm text-slate-600" suppressHydrationWarning>
          {formatToday()}
        </time>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          AI Agent Ready
        </span>
      </div>
    </header>
  );
}

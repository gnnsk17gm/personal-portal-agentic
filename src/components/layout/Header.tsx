"use client";

import { usePathname } from "next/navigation";
import { DEFAULT_PORTAL_MODE, type PortalMode } from "@/lib/portalMode";

const PORTFOLIO_PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks & Projects",
  "/notes": "Second Brain",
  "/agent": "Agent Status & Logs",
  "/settings": "Settings",
};

const STANDARD_PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/tasks": "Tasks",
  "/notes": "Notes",
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

export default function Header({ mode = DEFAULT_PORTAL_MODE }: { mode?: PortalMode }) {
  const pathname = usePathname();
  const titles = mode === "portfolio" ? PORTFOLIO_PAGE_TITLES : STANDARD_PAGE_TITLES;
  const title = titles[pathname] ?? "Personal Portal";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-4">
        <time className="text-sm text-slate-600" suppressHydrationWarning>
          {formatToday()}
        </time>
        {mode === "portfolio" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            AI Agent Ready
          </span>
        ) : null}
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Bot,
  Brain,
  Home,
  LayoutDashboard,
  ListChecks,
  Settings,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { setPortalModeAction } from "@/app/actions";
import {
  DEFAULT_PORTAL_MODE,
  getNextPortalMode,
  type PortalMode,
} from "@/lib/portalMode";
import type { NavItem } from "@/types/portal";

const ICONS: Record<string, LucideIcon> = {
  Home,
  LayoutDashboard,
  ListChecks,
  StickyNote,
  Brain,
  Bot,
  Settings,
};

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", iconName: "LayoutDashboard" },
  { id: "tasks", label: "Tasks & Projects", href: "/tasks", iconName: "ListChecks" },
  { id: "notes", label: "Second Brain", href: "/notes", iconName: "Brain" },
  { id: "agent", label: "Agent Status & Logs", href: "/agent", iconName: "Bot" },
  { id: "settings", label: "Settings", href: "/settings", iconName: "Settings" },
];

const STANDARD_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", href: "/", iconName: "Home" },
  { id: "tasks", label: "Tasks", href: "/tasks", iconName: "ListChecks" },
  { id: "notes", label: "Notes", href: "/notes", iconName: "StickyNote" },
  { id: "settings", label: "Settings", href: "/settings", iconName: "Settings" },
];

export default function Sidebar({ mode = DEFAULT_PORTAL_MODE }: { mode?: PortalMode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const items = mode === "portfolio" ? NAV_ITEMS : STANDARD_NAV_ITEMS;
  const nextMode = getNextPortalMode(mode);
  const toggleLabel = mode === "portfolio" ? "基本" : "Portfolio";

  const handleToggleMode = () => {
    startTransition(async () => {
      await setPortalModeAction(nextMode);
      router.refresh();
    });
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center px-6 text-lg font-semibold text-slate-900">
        Personal Portal
      </div>
      <nav className="flex flex-col gap-1 px-3 py-2" aria-label="メインナビゲーション">
        {items.map((item) => {
          const Icon = ICONS[item.iconName];
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {Icon ? <Icon size={18} aria-hidden="true" /> : null}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-100 px-3 py-2.5">
        <button
          type="button"
          onClick={handleToggleMode}
          disabled={pending}
          aria-label={mode === "portfolio" ? "基本モードへ切替" : "Portfolioモードへ切替"}
          className="w-full rounded-md px-2.5 py-1.5 text-left text-xs text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
        >
          {pending ? "切替中..." : toggleLabel}
        </button>
      </div>
    </aside>
  );
}

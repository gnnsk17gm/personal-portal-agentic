"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Brain,
  LayoutDashboard,
  ListChecks,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/types/portal";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  ListChecks,
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center px-6 text-lg font-semibold text-slate-900">
        Personal Portal
      </div>
      <nav className="flex flex-col gap-1 px-3 py-2" aria-label="メインナビゲーション">
        {NAV_ITEMS.map((item) => {
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
    </aside>
  );
}

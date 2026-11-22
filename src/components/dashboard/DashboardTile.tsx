"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

interface DashboardTileProps {
  href: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

/**
 * 3列正方形タイルダッシュボード用の共通タイル枠。
 * 余白クリックで href へ遷移し、タイトルヘッダーはアクセシビリティのため Link で提供する。
 */
export default function DashboardTile({
  href,
  title,
  icon,
  badge,
  children,
}: DashboardTileProps) {
  const router = useRouter();

  return (
    <section
      onClick={() => router.push(href)}
      className="group flex aspect-square cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded"
        >
          {icon}
          <span className="truncate">{title}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          {badge}
          <ArrowUpRight
            size={16}
            className="text-slate-300 transition-colors group-hover:text-slate-500"
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto">
        {children}
      </div>
    </section>
  );
}

/**
 * タイル内部のインタラクティブ要素（チェックボックス・入力欄・ボタン等）を囲み、
 * クリック時の画面遷移（イベントバブリング）を防止するラッパー。
 */
export function TileInteractiveArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div onClick={(e) => e.stopPropagation()} className={className}>
      {children}
    </div>
  );
}

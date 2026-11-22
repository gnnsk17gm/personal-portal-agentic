"use client";

import { useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpRight, X } from "lucide-react";
import type { DashboardTileId } from "@/lib/dashboardTiles";
import {
  LONG_PRESS_DELAY_MS,
  hasExceededMoveTolerance,
  isInteractiveTarget,
  type Point,
} from "@/lib/longPress";

interface DashboardTileProps {
  id: DashboardTileId;
  href: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  isEditing?: boolean;
  jiggleVariant?: 0 | 1 | 2;
  onEnterEditMode?: () => void;
  onRemove?: () => void;
}

const JIGGLE_CLASS: Record<0 | 1 | 2, string> = {
  0: "animate-tile-jiggle",
  1: "animate-tile-jiggle-alt-1",
  2: "animate-tile-jiggle-alt-2",
};

/**
 * 3列正方形タイルダッシュボード用の共通タイル枠。
 * - 通常モード: 短押しクリックで href へ遷移、500ms 長押しで編集モードへ移行。
 * - 編集モード: @dnd-kit/sortable によるリアルタイム並び替え、iPhone風の振動アニメーション、左上の円形「×」削除バッジを提供。
 */
export default function DashboardTile({
  id,
  href,
  title,
  icon,
  badge,
  children,
  isEditing = false,
  jiggleVariant = 0,
  onEnterEditMode,
  onRemove,
}: DashboardTileProps) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const suppressNextClickRef = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isEditing,
  });

  const cancelLongPress = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPointRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (isEditing) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    cancelLongPress();
    startPointRef.current = { x: event.clientX, y: event.clientY };
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      startPointRef.current = null;
      suppressNextClickRef.current = true;
      onEnterEditMode?.();
    }, LONG_PRESS_DELAY_MS);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (isEditing || !startPointRef.current) return;
    if (hasExceededMoveTolerance(startPointRef.current, { x: event.clientX, y: event.clientY })) {
      cancelLongPress();
    }
  };

  const handleClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleTileClick = () => {
    if (isEditing) return;
    router.push(href);
  };

  const sortableStyle = isEditing
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined;

  const wrapperClass = isDragging
    ? "relative z-50 scale-105 opacity-90"
    : "relative";

  const sectionClass = isEditing
    ? isDragging
      ? "flex aspect-square touch-none select-none cursor-grabbing flex-col justify-between overflow-hidden rounded-2xl border-2 border-indigo-400 bg-white p-5 shadow-xl ring-2 ring-indigo-200"
      : "flex aspect-square touch-none select-none cursor-grab active:cursor-grabbing flex-col justify-between overflow-hidden rounded-2xl border-2 border-dashed border-indigo-300 bg-white p-5 shadow-sm ring-2 ring-indigo-50 transition-shadow hover:shadow-md"
    : "group flex aspect-square select-none cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md";

  const innerJiggleClass = isEditing && !isDragging ? JIGGLE_CLASS[jiggleVariant] : "";

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      data-tile-surface="true"
      className={wrapperClass}
    >
      <div className={`relative ${innerJiggleClass}`}>
        {isEditing ? (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            aria-label={`${title} を非表示にする`}
            title="削除（非表示）"
            className="absolute -top-2.5 -left-2.5 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}

        <section
          {...(isEditing
            ? { ...attributes, ...listeners }
            : {
                onPointerDown: handlePointerDown,
                onPointerMove: handlePointerMove,
                onPointerUp: cancelLongPress,
                onPointerCancel: cancelLongPress,
              })}
          onClick={handleTileClick}
          onClickCapture={handleClickCapture}
          onContextMenu={(e) => {
            if (isEditing || timerRef.current !== null) {
              e.preventDefault();
            }
          }}
          className={sectionClass}
        >
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
            {isEditing ? (
              <div className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900">
                {icon}
                <span className="truncate">{title}</span>
              </div>
            ) : (
              <Link
                href={href}
                onClick={(e) => e.stopPropagation()}
                className="flex min-w-0 items-center gap-2 rounded text-base font-semibold text-slate-900 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                {icon}
                <span className="truncate">{title}</span>
              </Link>
            )}

            {!isEditing ? (
              <div className="flex shrink-0 items-center gap-1.5">
                {badge}
                <ArrowUpRight
                  size={16}
                  className="text-slate-300 transition-colors group-hover:text-slate-500"
                  aria-hidden="true"
                />
              </div>
            ) : (
              badge
            )}
          </div>

          <div
            className={
              isEditing
                ? "pointer-events-none flex min-h-0 flex-1 select-none flex-col justify-between overflow-y-auto opacity-75"
                : "flex min-h-0 flex-1 flex-col justify-between overflow-y-auto"
            }
          >
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * タイル内部のインタラクティブ要素（チェックボックス・入力欄・ボタン等）を囲み、
 * クリック時の画面遷移および長押し編集の誤発火を防止するラッパー。
 */
export function TileInteractiveArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-tile-interactive="true"
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      {children}
    </div>
  );
}

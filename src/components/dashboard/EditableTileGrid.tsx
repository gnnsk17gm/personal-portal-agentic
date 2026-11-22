"use client";

import { useRef, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus, RotateCcw } from "lucide-react";
import { updateDashboardTilesAction } from "@/app/actions";
import DashboardTile from "@/components/dashboard/DashboardTile";
import {
  DEFAULT_DASHBOARD_TILES,
  addTile,
  getAvailableTilesToAdd,
  isDashboardTileId,
  removeTile,
  reorderTiles,
  type DashboardTileId,
} from "@/lib/dashboardTiles";

export interface TileSlotItem {
  id: DashboardTileId;
  href: string;
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  content: ReactNode;
}

interface EditableTileGridProps {
  initialTiles: DashboardTileId[];
  tileSlots: Record<DashboardTileId, TileSlotItem>;
}

/**
 * 基本モードの3列正方形タイルグリッド。
 * - 通常モード: タイルを 500ms 長押しすることで編集モードへ移行。
 * - 編集モード: @dnd-kit/sortable によるリアルタイム並び替え、削除バッジ、追加スロット、リセット操作を提供し、背景余白クリックで終了。
 */
export default function EditableTileGrid({
  initialTiles,
  tileSlots,
}: EditableTileGridProps) {
  const [tiles, setTiles] = useState<DashboardTileId[]>(initialTiles);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const suppressBackgroundClickRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const availableTiles = getAvailableTilesToAdd(tiles);

  const persistTiles = (nextTiles: DashboardTileId[]) => {
    setTiles(nextTiles);
    startTransition(async () => {
      await updateDashboardTilesAction(nextTiles);
    });
  };

  const suppressNextBackgroundClick = () => {
    suppressBackgroundClickRef.current = true;
    setTimeout(() => {
      suppressBackgroundClickRef.current = false;
    }, 0);
  };

  const handleRemove = (id: DashboardTileId) => {
    persistTiles(removeTile(tiles, id));
  };

  const handleAdd = (id: DashboardTileId) => {
    persistTiles(addTile(tiles, id));
  };

  const handleReset = () => {
    persistTiles([...DEFAULT_DASHBOARD_TILES]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    suppressNextBackgroundClick();

    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    if (!isDashboardTileId(activeId) || !isDashboardTileId(overId)) {
      return;
    }

    const fromIndex = tiles.indexOf(activeId);
    const toIndex = tiles.indexOf(overId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }

    persistTiles(reorderTiles(tiles, fromIndex, toIndex));
  };

  const handleDragCancel = () => {
    suppressNextBackgroundClick();
  };

  const handleBackgroundClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    if (suppressBackgroundClickRef.current) return;

    const target = event.target;
    if (target instanceof Element && target.closest('[data-tile-surface="true"]')) {
      return;
    }

    setIsEditing(false);
  };

  return (
    <div
      onClick={handleBackgroundClick}
      className={isEditing ? "min-h-[60vh] space-y-4 pb-12" : "space-y-4"}
    >
      {isEditing ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            ドラッグで並び替え・余白をクリックして編集終了
          </p>
          <button
            type="button"
            data-tile-surface="true"
            onClick={handleReset}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>初期配置に戻す</span>
          </button>
        </div>
      ) : null}

      {!isEditing && tiles.length === 0 ? (
        <div
          data-tile-surface="true"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center"
        >
          <p className="text-sm font-medium text-slate-700">表示中のタイルがありません</p>
          <p className="mt-1 text-xs text-slate-400">
            下のボタンからタイルを追加するか、初期配置に戻すことができます。
          </p>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            <Plus size={14} aria-hidden="true" />
            <span>タイルを追加する</span>
          </button>
        </div>
      ) : (
        <DndContext
          id="dashboard-tile-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={tiles} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((id) => {
                const slot = tileSlots[id];
                if (!slot) return null;
                return (
                  <DashboardTile
                    key={id}
                    id={id}
                    href={slot.href}
                    title={slot.title}
                    icon={slot.icon}
                    badge={slot.badge}
                    isEditing={isEditing}
                    onEnterEditMode={() => setIsEditing(true)}
                    onRemove={() => handleRemove(id)}
                  >
                    {slot.content}
                  </DashboardTile>
                );
              })}

              {isEditing ? (
                <section
                  aria-label="タイルを追加"
                  data-tile-surface="true"
                  className="flex aspect-square flex-col rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-5"
                >
                  <div className="mb-3 flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700">
                    <Plus size={16} className="text-indigo-600" aria-hidden="true" />
                    <span>タイルを追加</span>
                  </div>
                  {availableTiles.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium text-slate-500">
                        すべてのタイルが配置済みです
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        不要なタイルを削除すると、ここから再追加できます。
                      </p>
                    </div>
                  ) : (
                    <ul className="flex-1 space-y-2.5 overflow-y-auto">
                      {availableTiles.map((tile) => (
                        <li
                          key={tile.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {tile.title}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {tile.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAdd(tile.id)}
                            disabled={isPending}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                          >
                            <Plus size={13} aria-hidden="true" />
                            <span>追加</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

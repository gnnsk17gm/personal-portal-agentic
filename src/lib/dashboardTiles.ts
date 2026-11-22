export type DashboardTileId = 'tasks' | 'notes' | 'schedule' | 'memo_pad';

export interface DashboardTileDefinition {
  id: DashboardTileId;
  title: string;
  description: string;
  href: string;
}

export const DASHBOARD_TILES_COOKIE = 'dashboard_tiles';
export const DASHBOARD_TILES_MAX_AGE = 60 * 60 * 24 * 365;

/** 利用可能なダッシュボードタイルのマスターレジストリ */
export const TILE_REGISTRY: readonly DashboardTileDefinition[] = [
  {
    id: 'tasks',
    title: 'Tasks',
    description: '未完了タスク一覧・完了操作',
    href: '/tasks',
  },
  {
    id: 'notes',
    title: 'Notes',
    description: 'クイックメモ入力・最新メモ',
    href: '/notes',
  },
  {
    id: 'schedule',
    title: "Today's Schedule",
    description: '本日期限タスク・予定',
    href: '/tasks',
  },
  {
    id: 'memo_pad',
    title: 'Quick Scratchpad',
    description: 'ブラウザに自動保存される自由メモ・伝言板',
    href: '/notes',
  },
] as const;

/** 初回（Cookie未設定時）およびリセット時のデフォルト配置 */
export const DEFAULT_DASHBOARD_TILES: readonly DashboardTileId[] = [
  'tasks',
  'notes',
  'schedule',
] as const;

const VALID_TILE_IDS = new Set<string>(TILE_REGISTRY.map((tile) => tile.id));

/** 未知の値が有効な DashboardTileId かどうかを判定する Type Guard */
export function isDashboardTileId(value: unknown): value is DashboardTileId {
  return typeof value === 'string' && VALID_TILE_IDS.has(value);
}

/** 任意の配列から有効なタイルIDのみを抽出し、重複を除去（初出順を維持）する */
export function sanitizeDashboardTiles(ids: readonly unknown[]): DashboardTileId[] {
  const seen = new Set<DashboardTileId>();
  const result: DashboardTileId[] = [];

  for (const id of ids) {
    if (isDashboardTileId(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }

  return result;
}

/**
 * Cookie の生文字列（JSON配列）を安全な DashboardTileId 配列にパースする。
 * - 未設定（undefined / null / 空文字）または不正なJSONの場合はデフォルト3種を返す。
 * - 空配列 "[]" が明示的に保存されている場合はそのまま [] を返す。
 * - 不正なIDや重複は安全にフィルタリングする。
 */
export function parseDashboardTiles(raw: string | null | undefined): DashboardTileId[] {
  if (raw === undefined || raw === null || raw === '') {
    return [...DEFAULT_DASHBOARD_TILES];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_DASHBOARD_TILES];
    }
    return sanitizeDashboardTiles(parsed);
  } catch {
    return [...DEFAULT_DASHBOARD_TILES];
  }
}

/** タイルID配列を Cookie 保存用の JSON 文字列にシリアライズする */
export function serializeDashboardTiles(tiles: readonly DashboardTileId[]): string {
  return JSON.stringify(sanitizeDashboardTiles(tiles));
}

/** 指定したタイルを1つ左（前）へ移動した新しい配列を返す */
export function moveTileLeft(
  tiles: readonly DashboardTileId[],
  id: DashboardTileId,
): DashboardTileId[] {
  const index = tiles.indexOf(id);
  if (index <= 0) {
    return [...tiles];
  }
  const next = [...tiles];
  const prev = next[index - 1];
  next[index - 1] = next[index];
  next[index] = prev;
  return next;
}

/** 指定したタイルを1つ右（後ろ）へ移動した新しい配列を返す */
export function moveTileRight(
  tiles: readonly DashboardTileId[],
  id: DashboardTileId,
): DashboardTileId[] {
  const index = tiles.indexOf(id);
  if (index === -1 || index >= tiles.length - 1) {
    return [...tiles];
  }
  const next = [...tiles];
  const following = next[index + 1];
  next[index + 1] = next[index];
  next[index] = following;
  return next;
}

/**
 * 任意のインデックス間でタイルを移動した新しい配列を返す（イミュータブル）。
 * - fromIndex が範囲外または非整数のときは元配列のコピーをそのまま返す。
 * - toIndex が範囲外のときは 0 〜 length - 1 に丸める（clamp）。
 */
export function reorderTiles(
  tiles: readonly DashboardTileId[],
  fromIndex: number,
  toIndex: number,
): DashboardTileId[] {
  if (
    tiles.length === 0 ||
    !Number.isInteger(fromIndex) ||
    fromIndex < 0 ||
    fromIndex >= tiles.length
  ) {
    return [...tiles];
  }

  const clampedTo = Math.max(0, Math.min(tiles.length - 1, Math.trunc(toIndex)));
  if (fromIndex === clampedTo) {
    return [...tiles];
  }

  const next = [...tiles];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(clampedTo, 0, moved);
  return next;
}

/** 指定したタイルを配列から削除した新しい配列を返す */
export function removeTile(
  tiles: readonly DashboardTileId[],
  id: DashboardTileId,
): DashboardTileId[] {
  return tiles.filter((tileId) => tileId !== id);
}

/** 指定したタイルを配列末尾に追加した新しい配列を返す（重複および不正IDは追加しない） */
export function addTile(
  tiles: readonly DashboardTileId[],
  id: DashboardTileId,
): DashboardTileId[] {
  if (!isDashboardTileId(id) || tiles.includes(id)) {
    return [...tiles];
  }
  return [...tiles, id];
}

/** 現在未配置で追加可能なタイル定義一覧を返す */
export function getAvailableTilesToAdd(
  tiles: readonly DashboardTileId[],
): DashboardTileDefinition[] {
  const activeSet = new Set<DashboardTileId>(tiles);
  return TILE_REGISTRY.filter((tile) => !activeSet.has(tile.id));
}

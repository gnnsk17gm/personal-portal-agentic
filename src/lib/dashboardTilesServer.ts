import { cookies } from 'next/headers';
import {
  DASHBOARD_TILES_COOKIE,
  parseDashboardTiles,
  type DashboardTileId,
} from '@/lib/dashboardTiles';

/** サーバー側で Cookie から現在のダッシュボードタイル配列を取得する。 */
export async function getDashboardTiles(): Promise<DashboardTileId[]> {
  const cookieStore = await cookies();
  return parseDashboardTiles(cookieStore.get(DASHBOARD_TILES_COOKIE)?.value);
}

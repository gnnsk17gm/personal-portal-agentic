import { cookies } from 'next/headers';
import { PORTAL_MODE_COOKIE, parsePortalMode, type PortalMode } from '@/lib/portalMode';

/** サーバー側で Cookie から現在の PortalMode を取得する。 */
export async function getPortalMode(): Promise<PortalMode> {
  const cookieStore = await cookies();
  return parsePortalMode(cookieStore.get(PORTAL_MODE_COOKIE)?.value);
}

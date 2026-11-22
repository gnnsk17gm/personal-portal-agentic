export type PortalMode = 'standard' | 'portfolio';

export const PORTAL_MODE_COOKIE = 'portal_mode';
export const DEFAULT_PORTAL_MODE: PortalMode = 'standard';
export const PORTAL_MODE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie 値など外部入力を安全な PortalMode に正規化する。未設定・不正値は standard にフォールバックする。 */
export function parsePortalMode(value: string | null | undefined): PortalMode {
  return value === 'portfolio' ? 'portfolio' : DEFAULT_PORTAL_MODE;
}

/** 現在のモードから切り替え先のモードを返す。 */
export function getNextPortalMode(current: PortalMode): PortalMode {
  return current === 'standard' ? 'portfolio' : 'standard';
}

/** ポートフォリオモードかどうかを判定する。 */
export function isPortfolioMode(mode: PortalMode): boolean {
  return mode === 'portfolio';
}

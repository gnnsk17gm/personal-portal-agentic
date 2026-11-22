import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PORTAL_MODE,
  PORTAL_MODE_COOKIE,
  getNextPortalMode,
  isPortfolioMode,
  parsePortalMode,
} from '@/lib/portalMode';

describe('portalMode', () => {
  it('デフォルトモードは standard で Cookie 名は portal_mode である', () => {
    expect(DEFAULT_PORTAL_MODE).toBe('standard');
    expect(PORTAL_MODE_COOKIE).toBe('portal_mode');
  });

  describe('parsePortalMode', () => {
    it('未設定（undefined / null / 空文字）は standard を返す', () => {
      expect(parsePortalMode(undefined)).toBe('standard');
      expect(parsePortalMode(null)).toBe('standard');
      expect(parsePortalMode('')).toBe('standard');
    });

    it('有効なモード文字列をそのまま返す', () => {
      expect(parsePortalMode('standard')).toBe('standard');
      expect(parsePortalMode('portfolio')).toBe('portfolio');
    });

    it('不正な値や大文字混じりは standard にフォールバックする', () => {
      expect(parsePortalMode('PORTFOLIO')).toBe('standard');
      expect(parsePortalMode('admin')).toBe('standard');
      expect(parsePortalMode('portfolio ')).toBe('standard');
    });
  });

  describe('getNextPortalMode', () => {
    it('standard と portfolio を相互に反転する', () => {
      expect(getNextPortalMode('standard')).toBe('portfolio');
      expect(getNextPortalMode('portfolio')).toBe('standard');
    });
  });

  describe('isPortfolioMode', () => {
    it('portfolio のときのみ true を返す', () => {
      expect(isPortfolioMode('portfolio')).toBe(true);
      expect(isPortfolioMode('standard')).toBe(false);
    });
  });
});

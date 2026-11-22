import { describe, expect, it } from 'vitest';
import {
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_TOLERANCE_PX,
  hasExceededMoveTolerance,
  isInteractiveTarget,
  type InteractiveElementLike,
} from '@/lib/longPress';

describe('longPress', () => {
  it('デフォルトの長押し時間と移動許容距離が仕様どおりである', () => {
    expect(LONG_PRESS_DELAY_MS).toBe(500);
    expect(LONG_PRESS_MOVE_TOLERANCE_PX).toBe(10);
  });

  describe('hasExceededMoveTolerance', () => {
    it('移動距離が 10px 未満（0px, 9px, 9.9px）のときは false を返す', () => {
      expect(hasExceededMoveTolerance({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(false);
      expect(hasExceededMoveTolerance({ x: 100, y: 100 }, { x: 109, y: 100 })).toBe(false);
      expect(hasExceededMoveTolerance({ x: 100, y: 100 }, { x: 100, y: 109.9 })).toBe(false);
    });

    it('移動距離が 10px 以上（境界値 10px および超過）のときは true を返す', () => {
      expect(hasExceededMoveTolerance({ x: 100, y: 100 }, { x: 110, y: 100 })).toBe(true);
      expect(hasExceededMoveTolerance({ x: 100, y: 100 }, { x: 90, y: 100 })).toBe(true);
      expect(hasExceededMoveTolerance({ x: 100, y: 100 }, { x: 100, y: 115 })).toBe(true);
    });

    it('斜め移動をユークリッド距離で正確に判定する（6,8 → 10px で超過、6,7 → 9.22px で許容）', () => {
      expect(hasExceededMoveTolerance({ x: 0, y: 0 }, { x: 6, y: 7 })).toBe(false);
      expect(hasExceededMoveTolerance({ x: 0, y: 0 }, { x: 6, y: 8 })).toBe(true);
    });
  });

  describe('isInteractiveTarget', () => {
    it('null やプリミティブ値は false を返す', () => {
      expect(isInteractiveTarget(null)).toBe(false);
      expect(isInteractiveTarget(undefined)).toBe(false);
      expect(isInteractiveTarget('div')).toBe(false);
    });

    it('input / textarea / button / a / select タグは true を返す', () => {
      const tags = ['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'];
      for (const tagName of tags) {
        const el: InteractiveElementLike = { tagName };
        expect(isInteractiveTarget(el)).toBe(true);
      }
    });

    it('contentEditable 要素は true を返す', () => {
      const el: InteractiveElementLike = { tagName: 'DIV', isContentEditable: true };
      expect(isInteractiveTarget(el)).toBe(true);
    });

    it('親要素にインタラクティブ要素や data-tile-interactive がある場合は closest 経由で true を返す', () => {
      const el: InteractiveElementLike = {
        tagName: 'SPAN',
        closest: (selector: string) =>
          selector.includes('button') || selector.includes('data-tile-interactive') ? {} : null,
      };
      expect(isInteractiveTarget(el)).toBe(true);
    });

    it('通常の div / p / section 要素（インタラクティブな祖先なし）は false を返す', () => {
      const el: InteractiveElementLike = {
        tagName: 'DIV',
        isContentEditable: false,
        closest: () => null,
      };
      expect(isInteractiveTarget(el)).toBe(false);
    });
  });
});

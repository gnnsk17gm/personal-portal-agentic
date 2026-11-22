export const LONG_PRESS_DELAY_MS = 500;
export const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

export interface Point {
  x: number;
  y: number;
}

export interface InteractiveElementLike {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
}

const INTERACTIVE_TAG_NAMES = new Set([
  'INPUT',
  'TEXTAREA',
  'BUTTON',
  'A',
  'SELECT',
  'OPTION',
  'LABEL',
]);

const INTERACTIVE_SELECTOR =
  'input, textarea, button, a, select, option, label, [role="button"], [contenteditable="true"], [data-tile-interactive="true"]';

/**
 * 長押し開始地点からの移動距離が許容範囲（デフォルト 10px 未満）を超えたか判定する。
 */
export function hasExceededMoveTolerance(
  start: Point,
  current: Point,
  tolerancePx: number = LONG_PRESS_MOVE_TOLERANCE_PX,
): boolean {
  const distance = Math.hypot(current.x - start.x, current.y - start.y);
  return distance >= tolerancePx;
}

/**
 * イベントターゲットがタイル内のインタラクティブ要素（入力欄・ボタン・リンク等）かどうか判定する。
 * インタラクティブ要素への押下時は長押し編集を発火させないために使用する。
 */
export function isInteractiveTarget(target: unknown): boolean {
  if (typeof target !== 'object' || target === null) {
    return false;
  }

  const element = target as InteractiveElementLike;

  if (element.isContentEditable === true) {
    return true;
  }

  if (
    typeof element.tagName === 'string' &&
    INTERACTIVE_TAG_NAMES.has(element.tagName.toUpperCase())
  ) {
    return true;
  }

  if (typeof element.closest === 'function') {
    return Boolean(element.closest(INTERACTIVE_SELECTOR));
  }

  return false;
}

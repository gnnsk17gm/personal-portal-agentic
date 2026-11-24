import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_TILES_COOKIE,
  DEFAULT_DASHBOARD_TILES,
  TILE_REGISTRY,
  addTile,
  getAvailableTilesToAdd,
  moveTileLeft,
  moveTileRight,
  parseDashboardTiles,
  removeTile,
  reorderTiles,
  serializeDashboardTiles,
  type DashboardTileId,
} from '@/lib/dashboardTiles';

describe('dashboardTiles', () => {
  it('デフォルト設定とレジストリ定義が仕様どおりである', () => {
    expect(DASHBOARD_TILES_COOKIE).toBe('dashboard_tiles');
    expect(DEFAULT_DASHBOARD_TILES).toEqual(['tasks', 'notes', 'schedule', 'finance']);
    expect(TILE_REGISTRY.map((t) => t.id)).toEqual([
      'tasks',
      'notes',
      'schedule',
      'memo_pad',
      'finance',
    ]);
  });

  describe('parseDashboardTiles', () => {
    it('未設定（undefined / null / 空文字）はデフォルトの4種を返す', () => {
      expect(parseDashboardTiles(undefined)).toEqual(['tasks', 'notes', 'schedule', 'finance']);
      expect(parseDashboardTiles(null)).toEqual(['tasks', 'notes', 'schedule', 'finance']);
      expect(parseDashboardTiles('')).toEqual(['tasks', 'notes', 'schedule', 'finance']);
    });

    it('有効なJSON配列をそのまま順序どおりに返す', () => {
      expect(parseDashboardTiles('["schedule","memo_pad","tasks"]')).toEqual([
        'schedule',
        'memo_pad',
        'tasks',
      ]);
      expect(parseDashboardTiles('["finance","tasks"]')).toEqual(['finance', 'tasks']);
    });

    it('明示的に保存された空配列 [] は空のまま返す', () => {
      expect(parseDashboardTiles('[]')).toEqual([]);
    });

    it('不正なIDや非文字列・重複を安全にフィルタリングする', () => {
      expect(
        parseDashboardTiles('["tasks","invalid_tile",123,null,"notes","tasks","memo_pad","finance"]'),
      ).toEqual(['tasks', 'notes', 'memo_pad', 'finance']);
    });

    it('壊れたJSONや配列以外のJSONはデフォルトにフォールバックする', () => {
      expect(parseDashboardTiles('{broken json')).toEqual(['tasks', 'notes', 'schedule', 'finance']);
      expect(parseDashboardTiles('{"tasks":true}')).toEqual(['tasks', 'notes', 'schedule', 'finance']);
      expect(parseDashboardTiles('"tasks"')).toEqual(['tasks', 'notes', 'schedule', 'finance']);
      expect(parseDashboardTiles('123')).toEqual(['tasks', 'notes', 'schedule', 'finance']);
    });
  });

  describe('serializeDashboardTiles', () => {
    it('重複や不正値を除外したJSON配列文字列を返す', () => {
      expect(serializeDashboardTiles(['notes', 'tasks', 'notes'])).toBe('["notes","tasks"]');
      expect(serializeDashboardTiles([])).toBe('[]');
    });
  });

  describe('moveTileLeft', () => {
    it('指定したタイルを1つ左に移動し、元配列を変更しない', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule'];
      const moved = moveTileLeft(original, 'schedule');
      expect(moved).toEqual(['tasks', 'schedule', 'notes']);
      expect(original).toEqual(['tasks', 'notes', 'schedule']);
    });

    it('先頭タイル（境界値）を左に移動しても順序が変わらない', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule'];
      expect(moveTileLeft(original, 'tasks')).toEqual(['tasks', 'notes', 'schedule']);
    });

    it('存在しないタイルIDを指定しても順序が変わらない', () => {
      const original: DashboardTileId[] = ['tasks', 'notes'];
      expect(moveTileLeft(original, 'memo_pad')).toEqual(['tasks', 'notes']);
    });
  });

  describe('moveTileRight', () => {
    it('指定したタイルを1つ右に移動し、元配列を変更しない', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule'];
      const moved = moveTileRight(original, 'tasks');
      expect(moved).toEqual(['notes', 'tasks', 'schedule']);
      expect(original).toEqual(['tasks', 'notes', 'schedule']);
    });

    it('末尾タイル（境界値）を右に移動しても順序が変わらない', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule'];
      expect(moveTileRight(original, 'schedule')).toEqual(['tasks', 'notes', 'schedule']);
    });

    it('存在しないタイルIDを指定しても順序が変わらない', () => {
      const original: DashboardTileId[] = ['tasks', 'notes'];
      expect(moveTileRight(original, 'memo_pad')).toEqual(['tasks', 'notes']);
    });
  });

  describe('removeTile', () => {
    it('指定したタイルを削除した新配列を返す', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule'];
      expect(removeTile(original, 'notes')).toEqual(['tasks', 'schedule']);
      expect(original).toEqual(['tasks', 'notes', 'schedule']);
    });

    it('最後の1件を削除すると空配列になる', () => {
      expect(removeTile(['tasks'], 'tasks')).toEqual([]);
    });

    it('存在しないタイルを指定しても配列が変わらない', () => {
      expect(removeTile(['tasks', 'notes'], 'memo_pad')).toEqual(['tasks', 'notes']);
    });
  });

  describe('addTile', () => {
    it('未配置のタイルを末尾に追加する', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule'];
      expect(addTile(original, 'memo_pad')).toEqual([
        'tasks',
        'notes',
        'schedule',
        'memo_pad',
      ]);
      expect(original).toEqual(['tasks', 'notes', 'schedule']);
    });

    it('すでに配置済みのタイルを追加しても重複しない', () => {
      const original: DashboardTileId[] = ['tasks', 'notes'];
      expect(addTile(original, 'tasks')).toEqual(['tasks', 'notes']);
    });
  });

  describe('getAvailableTilesToAdd', () => {
    it('デフォルト4種配置時は memo_pad のみが追加候補になる', () => {
      const available = getAvailableTilesToAdd(['tasks', 'notes', 'schedule', 'finance']);
      expect(available.map((t) => t.id)).toEqual(['memo_pad']);
    });

    it('既存の3種Cookie保存済みユーザーには memo_pad と finance が追加候補になる', () => {
      const available = getAvailableTilesToAdd(['tasks', 'notes', 'schedule']);
      expect(available.map((t) => t.id)).toEqual(['memo_pad', 'finance']);
    });

    it('削除したタイルも追加候補に含まれる', () => {
      const available = getAvailableTilesToAdd(['tasks', 'schedule']);
      expect(available.map((t) => t.id)).toEqual(['notes', 'memo_pad', 'finance']);
    });

    it('全タイル配置済みの場合は空配列を返す', () => {
      const available = getAvailableTilesToAdd([
        'tasks',
        'notes',
        'schedule',
        'memo_pad',
        'finance',
      ]);
      expect(available).toEqual([]);
    });
  });

  describe('reorderTiles', () => {
    it('後方へ移動できる（インデックス 0 → 2）かつ元配列を変更しない', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule', 'memo_pad'];
      const reordered = reorderTiles(original, 0, 2);
      expect(reordered).toEqual(['notes', 'schedule', 'tasks', 'memo_pad']);
      expect(original).toEqual(['tasks', 'notes', 'schedule', 'memo_pad']);
    });

    it('前方へ移動できる（インデックス 2 → 0）', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule', 'memo_pad'];
      expect(reorderTiles(original, 2, 0)).toEqual([
        'schedule',
        'tasks',
        'notes',
        'memo_pad',
      ]);
    });

    it('行をまたぐ移動（先頭 ↔ 末尾）ができる', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule', 'memo_pad'];
      expect(reorderTiles(original, 0, 3)).toEqual([
        'notes',
        'schedule',
        'memo_pad',
        'tasks',
      ]);
      expect(reorderTiles(original, 3, 0)).toEqual([
        'memo_pad',
        'tasks',
        'notes',
        'schedule',
      ]);
    });

    it('同一インデックス指定時は元配列と同じ内容の新配列を返す', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule'];
      const reordered = reorderTiles(original, 1, 1);
      expect(reordered).toEqual(['tasks', 'notes', 'schedule']);
      expect(reordered).not.toBe(original);
    });

    it('fromIndex が範囲外（負数・配列長以上・非整数）のときは変更なしのコピーを返す', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule'];
      expect(reorderTiles(original, -1, 1)).toEqual(['tasks', 'notes', 'schedule']);
      expect(reorderTiles(original, 3, 0)).toEqual(['tasks', 'notes', 'schedule']);
      expect(reorderTiles(original, 99, 0)).toEqual(['tasks', 'notes', 'schedule']);
    });

    it('toIndex が範囲外のときは 0 〜 length - 1 に丸めて移動する', () => {
      const original: DashboardTileId[] = ['tasks', 'notes', 'schedule'];
      expect(reorderTiles(original, 2, -5)).toEqual(['schedule', 'tasks', 'notes']);
      expect(reorderTiles(original, 0, 10)).toEqual(['notes', 'schedule', 'tasks']);
    });

    it('空配列に対して安全に空配列を返す', () => {
      expect(reorderTiles([], 0, 1)).toEqual([]);
    });
  });
});

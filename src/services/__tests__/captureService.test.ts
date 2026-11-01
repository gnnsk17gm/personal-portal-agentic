import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type AppDb } from '@/db';
import { captures } from '@/db/schema';
import { createCapture, deleteCapture, getAllCaptures, getRecentCaptures } from '@/services/captureService';

describe('captureService', () => {
  let db: AppDb;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('createCapture', () => {
    it('メモを保存し、ISO 8601 の作成日時が入る', () => {
      createCapture('買い物メモ', db);
      const [row] = getAllCaptures(undefined, db);
      expect(row.content).toBe('買い物メモ');
      expect(new Date(row.createdAt).toISOString()).toBe(row.createdAt);
    });

    it('前後の空白は除去され、空文字は Error になる', () => {
      createCapture('  hello  ', db);
      expect(getAllCaptures(undefined, db)[0].content).toBe('hello');
      expect(() => createCapture('   ', db)).toThrow();
      expect(getAllCaptures(undefined, db)).toHaveLength(1);
    });

    it('長文も保存できる', () => {
      const long = 'あ'.repeat(10000);
      createCapture(long, db);
      expect(getAllCaptures(undefined, db)[0].content).toHaveLength(10000);
    });
  });

  describe('getAllCaptures / getRecentCaptures', () => {
    it('新しい順（id 降順）で全件返す', () => {
      createCapture('first', db);
      createCapture('second', db);
      createCapture('third', db);
      expect(getAllCaptures(undefined, db).map((c) => c.content)).toEqual(['third', 'second', 'first']);
    });

    it('getRecentCaptures は limit 件に絞る', () => {
      for (const c of ['a', 'b', 'c', 'd']) createCapture(c, db);
      expect(getRecentCaptures(2, db).map((c) => c.content)).toEqual(['d', 'c']);
    });
  });

  describe('検索', () => {
    beforeEach(() => {
      createCapture('Next.js の学習メモ', db);
      createCapture('Drizzle ORM 100% 理解', db);
      createCapture('under_score と underXscore', db);
    });

    it('部分一致で絞り込め、大文字小文字を区別しない', () => {
      expect(getAllCaptures('drizzle', db).map((c) => c.content)).toEqual(['Drizzle ORM 100% 理解']);
      expect(getAllCaptures('NEXT.JS', db)).toHaveLength(1);
      expect(getAllCaptures('学習', db)).toHaveLength(1);
    });

    it('一致しなければ空配列', () => {
      expect(getAllCaptures('存在しない', db)).toEqual([]);
    });

    it('空文字・空白のみは全件を返す', () => {
      expect(getAllCaptures('', db)).toHaveLength(3);
      expect(getAllCaptures('   ', db)).toHaveLength(3);
    });

    it('% と _ はワイルドカードではなくリテラルとして扱う', () => {
      expect(getAllCaptures('%', db).map((c) => c.content)).toEqual(['Drizzle ORM 100% 理解']);
      expect(getAllCaptures('_', db).map((c) => c.content)).toEqual(['under_score と underXscore']);
      expect(getAllCaptures('under_score', db)).toHaveLength(1);
    });

    it('バックスラッシュもリテラルとして扱う', () => {
      db.insert(captures).values({ content: 'C:\\path', createdAt: new Date().toISOString() }).run();
      expect(getAllCaptures('\\', db).map((c) => c.content)).toEqual(['C:\\path']);
    });
  });

  describe('deleteCapture', () => {
    it('存在する id を削除すると true、再削除は false', () => {
      createCapture('消す', db);
      const [row] = getAllCaptures(undefined, db);
      expect(deleteCapture(row.id, db)).toBe(true);
      expect(getAllCaptures(undefined, db)).toHaveLength(0);
      expect(deleteCapture(row.id, db)).toBe(false);
    });

    it('他のメモには影響しない', () => {
      createCapture('keep', db);
      createCapture('drop', db);
      const drop = getAllCaptures('drop', db)[0];
      deleteCapture(drop.id, db);
      expect(getAllCaptures(undefined, db).map((c) => c.content)).toEqual(['keep']);
    });
  });
});

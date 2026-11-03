import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';
import { createCapture } from '@/services/captureService';
import { tokenizeText, computeBM25, searchNotes } from '@/services/searchService';
import type { AppDb } from '@/db';

describe('searchService (BM25 & Tokenizer)', () => {
  describe('tokenizeText', () => {
    it('英数字の単語を小文字に正規化し、空白や記号で分割する', () => {
      const tokens = tokenizeText('Next.js 14 & React-Server-Components!');
      expect(tokens).toContain('next');
      expect(tokens).toContain('js');
      expect(tokens).toContain('14');
      expect(tokens).toContain('react');
      expect(tokens).toContain('server');
      expect(tokens).toContain('components');
    });

    it('日本語の連続区間を Bi-gram に分割する', () => {
      const tokens = tokenizeText('検索エンジン');
      // 検・索・エ・ン・ジ・ン -> 検索, 索エ, エン, ンジ, ジン
      expect(tokens).toEqual(['検索', '索エ', 'エン', 'ンジ', 'ジン']);
    });

    it('1文字のみの日本語区間は Unigram として抽出する', () => {
      const tokens = tokenizeText('A本B');
      expect(tokens).toEqual(['a', '本', 'b']);
    });

    it('英数字と日本語が混在した文章を適切にトークナイズする', () => {
      const tokens = tokenizeText('Next.jsの学習ノート');
      // next, js, の学, 学習, 習ノ, ノー, ート
      expect(tokens).toContain('next');
      expect(tokens).toContain('js');
      expect(tokens).toContain('学習');
    });

    it('空文字や空白のみの場合は空配列を返す', () => {
      expect(tokenizeText('')).toEqual([]);
      expect(tokenizeText('   \n\t ')).toEqual([]);
    });

    it('記号のみの場合は空配列を返す', () => {
      expect(tokenizeText('!@#$%^&*()_+-=[]{}|;:",.<>?/')).toEqual([]);
    });
  });

  describe('computeBM25', () => {
    const docs = [
      { id: 1, content: 'Next.js React TypeScript Next.js', createdAt: '2026-01-01' },
      { id: 2, content: 'Vue React JavaScript', createdAt: '2026-01-02' },
      { id: 3, content: 'Python Django Backend', createdAt: '2026-01-03' },
    ];

    it('クエリにマッチするドキュメントに正のスコアを与え、スコア降順でソートする', () => {
      const results = computeBM25('Next.js', docs);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(1);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('TF（出現頻度）が高いドキュメントが上位になる', () => {
      const testDocs = [
        { id: 1, content: 'React React React', createdAt: '2026-01-01' },
        { id: 2, content: 'React Vue', createdAt: '2026-01-02' },
      ];
      const results = computeBM25('React', testDocs);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe(1);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('稀少語（高IDF）の一致が一般的な語より重視される', () => {
      const corpus = [
        { id: 1, content: 'Next.js Framework CommonWord', createdAt: '2026-01-01' },
        { id: 2, content: 'Other CommonWord', createdAt: '2026-01-02' },
        { id: 3, content: 'Another CommonWord', createdAt: '2026-01-03' },
      ];
      // Framework は id: 1 にしか登場しないため IDF が高い
      // CommonWord は全ドキュメントに登場するため IDF が低い
      const results = computeBM25('Framework CommonWord', corpus);
      expect(results[0].id).toBe(1);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('クエリ語が一切マッチしない場合は空配列（スコア0除外）を返す', () => {
      const results = computeBM25('Flutter Dart', docs);
      expect(results).toEqual([]);
    });

    it('クエリが空または記号のみの場合は空配列を返す', () => {
      expect(computeBM25('', docs)).toEqual([]);
      expect(computeBM25('   ', docs)).toEqual([]);
      expect(computeBM25('!@#$', docs)).toEqual([]);
    });
  });

  describe('searchNotes (DB統合テスト)', () => {
    let sqlite: Database.Database;
    let db: AppDb;

    beforeEach(() => {
      sqlite = new Database(':memory:');
      sqlite.exec(`
        CREATE TABLE captures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      db = drizzle(sqlite, { schema });
    });

    it('空クエリ時は全件を作成日時の降順（id降順）で返し、scoreは付与されない（またはundefined）', () => {
      createCapture('first note', db);
      createCapture('second note', db);
      createCapture('third note', db);

      const results = searchNotes('', db);
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.content)).toEqual(['third note', 'second note', 'first note']);
      expect(results[0].score).toBeUndefined();
    });

    it('検索クエリがある場合、BM25スコアの高い順にソートされ、scoreが付与される', () => {
      createCapture('Reactの基礎学習', db);
      createCapture('Next.jsとReactのServer Components活用', db);
      createCapture('Pythonのデータ分析入門', db);

      const results = searchNotes('Next.js', db);
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('Next.js');
      expect(results[0].score).toBeDefined();
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('日本語キーワード（Bi-gram）でも適切にマッチングされる', () => {
      createCapture('機械学習の基礎アルゴリズム', db);
      createCapture('Webフロントエンド開発', db);

      const results = searchNotes('機械学習', db);
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('機械学習の基礎アルゴリズム');
    });

    it('マッチするノートが0件の場合は空配列を返す', () => {
      createCapture('Vue.jsの入門', db);
      const results = searchNotes('Rust', db);
      expect(results).toEqual([]);
    });
  });
});

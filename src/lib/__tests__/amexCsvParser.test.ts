import { describe, expect, it } from 'vitest';
import {
  decodeCsvBuffer,
  inferCategoryByKeyword,
  inferExpenseCategory,
  normalizeAmexDate,
  normalizeMerchantNote,
  parseAmexAmount,
  parseAmexCsv,
  parseCsv,
} from '@/lib/amexCsvParser';

const AMEX_HEADER =
  'ご利用日,データ処理日,ご利用内容,カード会員様名,会員番号 #,金額,海外通貨利用金額,換算レート';

describe('amexCsvParser', () => {
  describe('decodeCsvBuffer', () => {
    it('UTF-8（BOM あり/なし）を文字化けなくデコードし BOM を除去する', () => {
      const text = `${AMEX_HEADER}\n2026/11/20,2026/11/21,セブンイレブン,TARO YAMADA,XXXX-12345,"1,308",,`;
      const encoder = new TextEncoder();
      const utf8Bytes = encoder.encode(text);
      expect(decodeCsvBuffer(utf8Bytes)).toBe(text);

      const bomBytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8Bytes]);
      expect(decodeCsvBuffer(bomBytes)).toBe(text);
    });

    it('Shift_JIS のバイト列を自動判別してデコードできる', () => {
      // Shift_JIS での「ご利用日」: 82 B2 97 98 97 70 93 FA
      const sjisBytes = new Uint8Array([0x82, 0xb2, 0x97, 0x98, 0x97, 0x70, 0x93, 0xfa]);
      expect(decodeCsvBuffer(sjisBytes)).toBe('ご利用日');
    });
  });

  describe('parseCsv & parseAmexCsv（RFC 4180 準拠）', () => {
    it('クォート・カンマ付き金額（"1,308"）や全角英数字・全角スペースを正しくパース・正規化する', () => {
      const csv = [
        AMEX_HEADER,
        '2026/11/20,2026/11/21,Ａｐｐｌｅ　ｉＴｕｎｅｓ　Ｓｔｏｒｅ ,TARO YAMADA,XXXX-12345,"1,308",,',
        '2026/11/19,2026/11/20,"セブンイレブン　渋谷店",TARO YAMADA,XXXX-12345,540,,',
        '2026/11/10,2026/11/10,口座振替によるお支払い,TARO YAMADA,XXXX-12345,"-45,000",,',
      ].join('\r\n');

      const { rows, skippedCount } = parseAmexCsv(csv);
      expect(skippedCount).toBe(0);
      expect(rows).toHaveLength(3);

      expect(rows[0]).toMatchObject({
        date: '2026-11-20',
        note: 'Apple iTunes Store',
        amount: 1308,
        isNegativeOrZero: false,
      });

      expect(rows[1]).toMatchObject({
        date: '2026-11-19',
        note: 'セブンイレブン 渋谷店',
        amount: 540,
        isNegativeOrZero: false,
      });

      expect(rows[2]).toMatchObject({
        date: '2026-11-10',
        note: '口座振替によるお支払い',
        amount: -45000,
        isNegativeOrZero: true,
      });
    });

    it('クォート内のエスケープ "" を復元できる', () => {
      const rows = parseCsv('a,"b""c",d');
      expect(rows).toEqual([['a', 'b"c', 'd']]);
    });

    it('必須ヘッダーが存在しない場合はエラーを投げる', () => {
      expect(() => parseAmexCsv('date,description,price\n2026/11/20,test,100')).toThrow(
        'AMEX 利用明細のヘッダー',
      );
    });
  });

  describe('normalizeMerchantNote / normalizeAmexDate / parseAmexAmount', () => {
    it('全角英数字・連続空白を NFKC 正規化して 100 文字上限で切り詰める', () => {
      expect(normalizeMerchantNote('　Ａｐｐｌｅ　　ｉＴｕｎｅｓ   Ｓｔｏｒｅ　')).toBe(
        'Apple iTunes Store',
      );
      const longText = 'あ'.repeat(120);
      expect(normalizeMerchantNote(longText)).toHaveLength(100);
    });

    it('YYYY/MM/DD を YYYY-MM-DD に変換し、不正日付は null を返す', () => {
      expect(normalizeAmexDate('2026/11/20')).toBe('2026-11-20');
      expect(normalizeAmexDate('2026/1/5')).toBe('2026-01-05');
      expect(normalizeAmexDate('2026/02/30')).toBeNull();
      expect(normalizeAmexDate('invalid')).toBeNull();
    });

    it('カンマ付き整数や負の整数を正しくパースし、不正値は null を返す', () => {
      expect(parseAmexAmount('1,308')).toBe(1308);
      expect(parseAmexAmount('-12,345')).toBe(-12345);
      expect(parseAmexAmount('0')).toBe(0);
      expect(parseAmexAmount('')).toBeNull();
      expect(parseAmexAmount('abc')).toBeNull();
    });
  });

  describe('カテゴリ推測（履歴優先 → キーワード辞書 → その他）', () => {
    it('代表的な加盟店名キーワードから適切なカテゴリを推測する', () => {
      expect(inferCategoryByKeyword('セブンイレブン 渋谷店')).toBe('食費');
      expect(inferCategoryByKeyword('Amazon.co.jp')).toBe('日用品');
      expect(inferCategoryByKeyword('JR東日本 モバイルSuica')).toBe('交通費');
      expect(inferCategoryByKeyword('Apple iTunes Store')).toBe('趣味・娯楽');
      expect(inferCategoryByKeyword('ユザワヤ 蒲田店')).toBe('趣味・娯楽');
      expect(inferCategoryByKeyword('未知の商店')).toBeNull();
    });

    it('過去履歴マップに一致する場合はキーワード辞書より優先する', () => {
      const history = new Map<string, string>([['Amazon.co.jp', '趣味・娯楽']]);
      expect(inferExpenseCategory('Amazon.co.jp', history)).toEqual({
        category: '趣味・娯楽',
        source: 'history',
      });
      expect(inferExpenseCategory('ローソン 新宿店', history)).toEqual({
        category: '食費',
        source: 'keyword',
      });
      expect(inferExpenseCategory('未知の加盟店', history)).toEqual({
        category: 'その他',
        source: 'default',
      });
    });
  });
});

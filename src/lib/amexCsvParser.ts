import {
  MAX_NOTE_LENGTH,
  isValidCategoryForType,
  type ExpenseCategory,
} from '@/lib/finance-constants';

export interface ParsedAmexRow {
  rowIndex: number;
  date: string;
  rawNote: string;
  note: string;
  amount: number;
  isNegativeOrZero: boolean;
}

export interface ParseAmexCsvResult {
  rows: ParsedAmexRow[];
  skippedCount: number;
}

const KEYWORD_CATEGORY_RULES: ReadonlyArray<{
  category: ExpenseCategory;
  keywords: readonly string[];
}> = [
  {
    category: '食費',
    keywords: [
      'セブンイレブン',
      'セブン-イレブン',
      'ファミリーマート',
      'ローソン',
      'ミニストップ',
      'スーパー',
      'イオン',
      'ライフ',
      '西友',
      '成城石井',
      '業務スーパー',
      'スターバックス',
      'starbucks',
      'マクドナルド',
      '吉野家',
      'すき家',
      '松屋',
      'サイゼリヤ',
      'uber eats',
      'ubereats',
      '出前館',
      'カフェ',
      'コーヒー',
      'レストラン',
      '居酒屋',
      '弁当',
    ],
  },
  {
    category: '日用品',
    keywords: [
      'amazon',
      'アマゾン',
      'ドラッグストア',
      'マツモトキヨシ',
      'ウエルシア',
      'スギ薬局',
      'ツルハ',
      'ダイソー',
      'セリア',
      'ニトリ',
      '無印良品',
      'ホームセンター',
      'カインズ',
      'ヨドバシ',
      'ビックカメラ',
      'ロフト',
      'ハンズ',
    ],
  },
  {
    category: '交通費',
    keywords: [
      'jr',
      'suica',
      'pasmo',
      'icoca',
      'etc',
      'タクシー',
      'taxi',
      '鉄道',
      'メトロ',
      '新幹線',
      'ana',
      'jal',
      '航空',
      'ガソリン',
      'eneos',
      '出光',
      '駐車場',
      'タイムズ',
    ],
  },
  {
    category: '住居・光熱通信',
    keywords: [
      '電力',
      '電気',
      'ガス',
      '水道',
      'ntt',
      'ドコモ',
      'docomo',
      'ソフトバンク',
      'softbank',
      '楽天モバイル',
      'ahamo',
      'povo',
      'linemo',
      'nuro',
      '家賃',
      '管理費',
      'nhk',
    ],
  },
  {
    category: '趣味・娯楽',
    keywords: [
      'apple',
      'itunes',
      'netflix',
      'spotify',
      'ユザワヤ',
      'disney',
      'youtube',
      'steam',
      'nintendo',
      'playstation',
      '映画',
      'シネマ',
      '書店',
      '紀伊國屋',
      'ジュンク堂',
      'kindle',
      'audible',
      'カラオケ',
    ],
  },
  {
    category: '医療・健康',
    keywords: [
      '病院',
      'クリニック',
      '医院',
      '歯科',
      '薬局',
      '調剤',
      'ジム',
      'フィットネス',
      'スポーツクラブ',
      '整体',
    ],
  },
  {
    category: '衣服・美容',
    keywords: [
      'ユニクロ',
      'uniqlo',
      'zara',
      '美容室',
      '美容院',
      'ヘアサロン',
      'コスメ',
      'zozotown',
    ],
  },
  {
    category: '交際費',
    keywords: ['ギフト', 'プレゼント', '花屋'],
  },
];

/**
 * ArrayBuffer / Uint8Array を UTF-8（厳密モード）でデコードし、
 * 失敗した場合は Shift_JIS にフォールバックする。先頭 BOM は除去する。
 */
export function decodeCsvBuffer(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('shift_jis').decode(bytes);
  }
  return text.startsWith('\uFEFF') ? text.slice(1) : text;
}

/**
 * RFC 4180 準拠の CSV パーサー。
 * ダブルクォーテーション囲み、クォート内のカンマ・改行、`""` エスケープを正しく扱う。
 */
export function parseCsv(rawText: string): string[][] {
  const text = rawText.startsWith('\uFEFF') ? rawText.slice(1) : rawText;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * 加盟店名（ご利用内容）を NFKC 正規化し、連続空白を半角スペース 1 つへ整形・前後トリム、
 * 最大 100 文字に切り詰める。
 */
export function normalizeMerchantNote(raw: string): string {
  return raw.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_LENGTH);
}

/**
 * AMEX の日付文字列（YYYY/MM/DD 等）を内部標準の YYYY-MM-DD へ変換する。
 */
export function normalizeAmexDate(raw: string): string | null {
  const trimmed = raw.normalize('NFKC').trim();
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * AMEX の金額文字列（`"1,308"`, `"-50,000"` 等）からカンマを除去して整数値へ変換する。
 */
export function parseAmexAmount(raw: string): number | null {
  const cleaned = raw.normalize('NFKC').replace(/[,¥￥\s]/g, '');
  if (!/^-?\d+$/.test(cleaned)) {
    return null;
  }
  const value = Number.parseInt(cleaned, 10);
  if (!Number.isSafeInteger(value)) {
    return null;
  }
  return value;
}

/**
 * AMEX 利用明細 CSV テキストを解析し、正規化済み明細行の配列を返す。
 */
export function parseAmexCsv(csvText: string): ParseAmexCsvResult {
  const records = parseCsv(csvText);
  if (records.length === 0) {
    throw new Error('CSV ファイルが空です');
  }

  const header = records[0].map((cell) => cell.normalize('NFKC').trim());
  const dateIdx = header.findIndex((h) => h === 'ご利用日');
  const noteIdx = header.findIndex((h) => h === 'ご利用内容');
  const amountIdx = header.findIndex((h) => h === '金額');

  if (dateIdx === -1 || noteIdx === -1 || amountIdx === -1) {
    throw new Error(
      'AMEX 利用明細のヘッダー（ご利用日・ご利用内容・金額）が見つかりませんでした',
    );
  }

  const rows: ParsedAmexRow[] = [];
  let skippedCount = 0;

  for (let i = 1; i < records.length; i += 1) {
    const cols = records[i];
    const date = normalizeAmexDate(cols[dateIdx] ?? '');
    const amount = parseAmexAmount(cols[amountIdx] ?? '');
    const rawNote = cols[noteIdx] ?? '';

    if (date === null || amount === null) {
      skippedCount += 1;
      continue;
    }

    const note = normalizeMerchantNote(rawNote);
    rows.push({
      rowIndex: i,
      date,
      rawNote,
      note,
      amount,
      isNegativeOrZero: amount <= 0,
    });
  }

  return { rows, skippedCount };
}

/**
 * キーワード辞書による初期カテゴリ推測。一致しない場合は null を返す。
 */
export function inferCategoryByKeyword(normalizedNote: string): ExpenseCategory | null {
  const lower = normalizedNote.toLowerCase();
  for (const rule of KEYWORD_CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }
  return null;
}

/**
 * 過去履歴（優先度 1）→ キーワード辞書（優先度 2）→ 「その他」の順で支出カテゴリを推測する。
 */
export function inferExpenseCategory(
  normalizedNote: string,
  historyMap?: ReadonlyMap<string, string>,
): { category: ExpenseCategory; source: 'history' | 'keyword' | 'default' } {
  const fromHistory = historyMap?.get(normalizedNote);
  if (fromHistory && isValidCategoryForType('expense', fromHistory)) {
    return { category: fromHistory as ExpenseCategory, source: 'history' };
  }

  const fromKeyword = inferCategoryByKeyword(normalizedNote);
  if (fromKeyword) {
    return { category: fromKeyword, source: 'keyword' };
  }

  return { category: 'その他', source: 'default' };
}

import { getDb, type AppDb } from '@/db';
import { getAllCaptures } from '@/services/captureService';
import type { CapturePreview, RankedCapture, ScoredCapture } from '@/types/portal';

const K1 = 1.2;
const B = 0.75;

/**
 * 日本語文字判定（ひらがな、カタカナ、漢字、全角記号等）
 * Unicode range:
 * - 3040-309F: ひらがな
 * - 30A0-30FF: カタカナ
 * - 4E00-9FFF: CJK統合漢字
 * - 3400-4DBF: CJK統合漢字拡張A
 * - F900-FAFF: CJK互換漢字
 */
const CJK_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;

/**
 * テキストをトークン配列に分解する。
 * - 英数字は小文字化し、記号や空白で分割した単語単位。
 * - 日本語（CJK文字）の連続区間は Bi-gram（2文字連続）、1文字のみの区間は Unigram として抽出。
 */
export function tokenizeText(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const tokens: string[] = [];
  let currentAlphanumeric = '';
  let currentCJK = '';

  const flushAlphanumeric = () => {
    if (currentAlphanumeric.length > 0) {
      tokens.push(currentAlphanumeric.toLowerCase());
      currentAlphanumeric = '';
    }
  };

  const flushCJK = () => {
    if (currentCJK.length === 1) {
      tokens.push(currentCJK);
    } else if (currentCJK.length > 1) {
      for (let i = 0; i < currentCJK.length - 1; i++) {
        tokens.push(currentCJK.substring(i, i + 2));
      }
    }
    currentCJK = '';
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (/[a-zA-Z0-9]/.test(char)) {
      flushCJK();
      currentAlphanumeric += char;
    } else if (CJK_REGEX.test(char)) {
      flushAlphanumeric();
      currentCJK += char;
    } else {
      // 空白や記号
      flushAlphanumeric();
      flushCJK();
    }
  }

  flushAlphanumeric();
  flushCJK();

  return tokens;
}

/**
 * BM25 アルゴリズムにより、クエリに対する各ドキュメントの関連度スコアを計算し、
 * スコア > 0 のドキュメントを降順でソートして返す。
 */
export function computeBM25(query: string, docs: CapturePreview[]): RankedCapture[] {
  const queryTokens = tokenizeText(query);
  if (queryTokens.length === 0 || docs.length === 0) {
    return [];
  }

  const N = docs.length;

  // 各ドキュメントをトークナイズ
  const docTokensList = docs.map((doc) => tokenizeText(doc.content));
  const docLengths = docTokensList.map((tokens) => tokens.length);
  const totalLength = docLengths.reduce((sum, len) => sum + len, 0);
  const avgdl = totalLength / N || 1;

  // 各ドキュメント内のトークン頻度マップ: docIndex -> Map<token, count>
  const docTermFreqs: Map<string, number>[] = docTokensList.map((tokens) => {
    const freq = new Map<string, number>();
    for (const t of tokens) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    return freq;
  });

  // クエリトークンごとのドキュメント出現頻度 n(q) の集計
  // （クエリトークンに重複があっても各qのIDF計算は一意でOK）
  const uniqueQueryTokens = Array.from(new Set(queryTokens));
  const idfMap = new Map<string, number>();

  for (const q of uniqueQueryTokens) {
    let n_q = 0;
    for (const freq of docTermFreqs) {
      if (freq.has(q)) {
        n_q++;
      }
    }
    // IDF(q) = ln((N - n(q) + 0.5) / (n(q) + 0.5) + 1)
    const idf = Math.log((N - n_q + 0.5) / (n_q + 0.5) + 1);
    idfMap.set(q, idf);
  }

  // スコア計算
  const scoredDocs: RankedCapture[] = [];

  for (let i = 0; i < N; i++) {
    const doc = docs[i];
    const dLen = docLengths[i];
    const freqMap = docTermFreqs[i];
    let score = 0;

    for (const q of queryTokens) {
      const f = freqMap.get(q) ?? 0;
      if (f > 0) {
        const idf = idfMap.get(q) ?? 0;
        // BM25 公式: IDF * (f * (k1 + 1)) / (f + k1 * (1 - b + b * (|D| / avgdl)))
        const numerator = f * (K1 + 1);
        const denominator = f + K1 * (1 - B + B * (dLen / avgdl));
        score += idf * (numerator / denominator);
      }
    }

    if (score > 0) {
      // スコアは小数第2位程度に扱いやすいよう保持
      scoredDocs.push({
        ...doc,
        score: Math.round(score * 100) / 100,
      });
    }
  }

  // スコア降順（同点の場合は id 降順）
  scoredDocs.sort((a, b) => {
    const diff = (b.score ?? 0) - (a.score ?? 0);
    if (Math.abs(diff) > 1e-6) {
      return diff;
    }
    return b.id - a.id;
  });

  return scoredDocs;
}

/**
 * ノート一覧から検索クエリに基づいてBM25スコア順で検索する。
 * クエリが空の場合は、従来の作成日時降順（新しい順）で全件返す（scoreは付与しない）。
 */
export function searchNotes(query?: string, db: AppDb = getDb()): ScoredCapture[] {
  const trimmed = query?.trim() ?? '';
  if (trimmed.length === 0) {
    return getAllCaptures(undefined, db);
  }

  const allNotes = getAllCaptures(undefined, db);
  return computeBM25(trimmed, allNotes);
}

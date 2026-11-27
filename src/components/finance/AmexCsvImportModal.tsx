"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, RotateCcw, Upload, X } from "lucide-react";
import {
  importAmexTransactionsAction,
  previewAmexCsvAction,
} from "@/app/finance/actions";
import { decodeCsvBuffer, parseAmexCsv } from "@/lib/amexCsvParser";
import type { ClassifiedAmexRow } from "@/lib/finance";
import {
  EXPENSE_CATEGORIES,
  MAX_NOTE_LENGTH,
  formatYen,
  type ExpenseCategory,
} from "@/lib/finance-constants";

interface AmexCsvImportModalProps {
  currentMonth: string;
}

type ModalStep = "select" | "preview";

export default function AmexCsvImportModal({ currentMonth }: AmexCsvImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>("select");
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ClassifiedAmexRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        setIsOpen(false);
        setError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pending]);

  const resetModalState = () => {
    setStep("select");
    setFileName("");
    setRows([]);
    setSkippedCount(0);
    setError(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpen = () => {
    resetModalState();
    setNotice(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (pending) return;
    setIsOpen(false);
    setError(null);
  };

  const processFile = async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("CSV ファイル（.csv）を選択してください");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const csvText = decodeCsvBuffer(buffer);
      const parsed = parseAmexCsv(csvText);

      if (parsed.rows.length === 0) {
        setError("取り込み可能な明細行が見つかりませんでした");
        return;
      }

      startTransition(async () => {
        const res = await previewAmexCsvAction(
          parsed.rows.map((r) => ({
            rowIndex: r.rowIndex,
            date: r.date,
            note: r.note,
            amount: r.amount,
          })),
        );
        if (!res.ok) {
          setError(res.error ?? "プレビューの生成に失敗しました");
          return;
        }
        setFileName(file.name);
        setRows(res.rows);
        setSkippedCount(parsed.skippedCount);
        setStep("preview");
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV ファイルの読み込みに失敗しました");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleToggleRow = (rowIndex: number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowIndex === rowIndex && row.status !== "negative"
          ? { ...row, selected: !row.selected }
          : row,
      ),
    );
  };

  const handleSelectAllImportable = (checked: boolean) => {
    setRows((prev) =>
      prev.map((row) =>
        row.status === "negative" ? row : { ...row, selected: checked },
      ),
    );
  };

  const handleNoteChange = (rowIndex: number, nextNote: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowIndex === rowIndex ? { ...row, note: nextNote.slice(0, MAX_NOTE_LENGTH) } : row,
      ),
    );
  };

  const handleCategoryChange = (rowIndex: number, nextCategory: ExpenseCategory) => {
    setRows((prev) =>
      prev.map((row) =>
        row.rowIndex === rowIndex ? { ...row, category: nextCategory } : row,
      ),
    );
  };

  const selectedRows = rows.filter((row) => row.selected && row.status !== "negative");
  const selectedTotal = selectedRows.reduce((sum, row) => sum + row.amount, 0);
  const importableCount = rows.filter((row) => row.status !== "negative").length;
  const allImportableSelected = importableCount > 0 && selectedRows.length === importableCount;

  const handleImport = () => {
    if (selectedRows.length === 0) return;
    setError(null);

    startTransition(async () => {
      const res = await importAmexTransactionsAction(
        selectedRows.map((row) => ({
          date: row.date,
          amount: row.amount,
          category: row.category,
          note: row.note,
        })),
      );
      if (!res.ok) {
        setError(res.error ?? "一括登録に失敗しました");
        return;
      }

      const monthLabel = res.months.length > 0 ? `${res.months.join("・")}分` : "";
      const hasDifferentMonth = res.months.some((m) => m !== currentMonth);
      const message = hasDifferentMonth
        ? `${res.insertedCount}件を登録しました（${monthLabel}／表示中の ${currentMonth} 以外の月を含みます）`
        : `${res.insertedCount}件を登録しました${monthLabel ? `（${monthLabel}）` : ""}`;

      setNotice(message);
      setIsOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Upload size={14} className="text-slate-500" aria-hidden="true" />
        CSV取込
      </button>

      {notice ? (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-50 flex max-w-md items-center gap-2.5 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-medium text-emerald-800 shadow-lg"
        >
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="通知を閉じる"
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="amex-csv-modal-title"
        >
          <div
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet size={18} className="text-slate-600" aria-hidden="true" />
                <div>
                  <h3 id="amex-csv-modal-title" className="text-base font-semibold text-slate-900">
                    AMEX 利用明細 CSV インポート
                  </h3>
                  <p className="text-xs text-slate-500">
                    {step === "select"
                      ? "AMEX 会員サイトからダウンロードした CSV ファイルを選択してください"
                      : `${fileName}（全 ${rows.length} 件${skippedCount > 0 ? `／対象外 ${skippedCount} 行スキップ` : ""}）`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                aria-label="モーダルを閉じる"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* エラーメッセージ */}
            {error ? (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* モーダル本文 */}
            {step === "select" ? (
              <div className="p-6">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                    isDragging
                      ? "border-slate-500 bg-slate-50"
                      : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                  }`}
                >
                  <Upload size={28} className="text-slate-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-slate-800">
                    CSV ファイルをここにドラッグ＆ドロップ
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    UTF-8 / Shift_JIS を自動判別して読み込みます
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="CSV ファイルを選択"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Upload size={14} aria-hidden="true" />
                    {pending ? "解析中..." : "ファイルを選択"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* サマリーバー */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="font-medium text-slate-700">
                      選択中:{" "}
                      <strong className="text-slate-900 tabular-nums">
                        {selectedRows.length} 件
                      </strong>
                    </span>
                    <span className="font-medium text-slate-700">
                      合計:{" "}
                      <strong className="text-slate-900 tabular-nums">
                        {formatYen(selectedTotal)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllImportable(!allImportableSelected)}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {allImportableSelected ? "すべて解除" : "取込可能を全選択"}
                    </button>
                    <button
                      type="button"
                      onClick={resetModalState}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RotateCcw size={12} aria-hidden="true" />
                      ファイル再選択
                    </button>
                  </div>
                </div>

                {/* プレビューテーブル */}
                <div className="min-h-0 flex-1 overflow-auto px-6 py-3">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="w-9 py-2 pr-2 font-medium">取込</th>
                        <th className="w-28 py-2 pr-3 font-medium">日付</th>
                        <th className="py-2 pr-3 font-medium">ご利用内容（メモ）</th>
                        <th className="w-24 py-2 pr-3 text-right font-medium">金額</th>
                        <th className="w-36 py-2 pr-3 font-medium">カテゴリ</th>
                        <th className="w-40 py-2 font-medium">ステータス</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => {
                        const isNegative = row.status === "negative";
                        return (
                          <tr
                            key={row.rowIndex}
                            className={
                              isNegative
                                ? "bg-slate-50/70 text-slate-400"
                                : row.selected
                                  ? "bg-white text-slate-800"
                                  : "bg-slate-50/40 text-slate-500"
                            }
                          >
                            <td className="py-2.5 pr-2">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled={isNegative || pending}
                                onChange={() => handleToggleRow(row.rowIndex)}
                                aria-label={`${row.date} ${row.note} を取り込む`}
                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                              />
                            </td>
                            <td className="py-2.5 pr-3 font-mono text-[11px] tabular-nums">
                              {row.date}
                            </td>
                            <td className="py-2.5 pr-3">
                              <input
                                type="text"
                                value={row.note}
                                maxLength={MAX_NOTE_LENGTH}
                                disabled={isNegative || pending}
                                onChange={(e) => handleNoteChange(row.rowIndex, e.target.value)}
                                aria-label={`${row.rowIndex}行目のメモ`}
                                className="w-full min-w-[180px] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-slate-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                              />
                            </td>
                            <td
                              className={`py-2.5 pr-3 text-right font-semibold tabular-nums ${
                                isNegative ? "text-slate-400" : "text-slate-900"
                              }`}
                            >
                              {formatYen(row.amount)}
                            </td>
                            <td className="py-2.5 pr-3">
                              <select
                                value={row.category}
                                disabled={isNegative || pending}
                                onChange={(e) =>
                                  handleCategoryChange(
                                    row.rowIndex,
                                    e.target.value as ExpenseCategory,
                                  )
                                }
                                aria-label={`${row.rowIndex}行目のカテゴリ`}
                                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-slate-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                {EXPENSE_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5">
                              {row.status === "new" ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                                  新規
                                </span>
                              ) : row.status === "duplicate" ? (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                                  登録済み
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                                  引き落とし・返金（除外推奨）
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* モーダルフッター */}
                <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-white px-6 py-3.5">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={pending}
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={pending || selectedRows.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending
                      ? "登録中..."
                      : `選択した ${selectedRows.length} 件を一括登録`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Search, Trash2, X } from "lucide-react";
import { deleteTransactionAction, updateTransactionAction } from "@/app/finance/actions";
import type { FinanceTransactionRecord } from "@/lib/finance";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  MAX_NOTE_LENGTH,
  formatYen,
  getCategoriesForType,
  getCategoryStyle,
  type TransactionType,
} from "@/lib/finance-constants";

interface TransactionListProps {
  month: string;
  transactions: FinanceTransactionRecord[];
  selectedCategory: string | null;
}

type TypeFilter = "all" | TransactionType;

const ALL_CATEGORIES = Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));

export default function TransactionList({
  month,
  transactions,
  selectedCategory,
}: TransactionListProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [localCategory, setLocalCategory] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeCategory = selectedCategory ?? (localCategory || null);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (activeCategory && tx.category !== activeCategory) return false;
      if (q && !tx.note.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [transactions, typeFilter, activeCategory, keyword]);

  const handleCategorySelect = (value: string) => {
    setLocalCategory(value);
    if (selectedCategory) {
      const params = new URLSearchParams({ month });
      if (value) params.set("category", value);
      router.replace(`/finance?${params.toString()}`, { scroll: false });
    }
  };

  const handleStartEdit = (tx: FinanceTransactionRecord) => {
    setEditingId(tx.id);
    setEditAmount(String(tx.amount));
    setEditCategory(tx.category);
    setEditDate(tx.date);
    setEditNote(tx.note);
    setActionError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setActionError(null);
  };

  const handleSaveEdit = (tx: FinanceTransactionRecord) => {
    const parsedAmount = Number.parseInt(editAmount.trim(), 10);
    if (!/^\d+$/.test(editAmount.trim()) || Number.isNaN(parsedAmount) || parsedAmount < 1) {
      setActionError("金額は1円以上の整数で入力してください");
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const res = await updateTransactionAction(tx.id, {
        type: tx.type,
        amount: parsedAmount,
        category: editCategory,
        date: editDate,
        note: editNote,
      });
      if (!res.ok) {
        setActionError(res.error ?? "明細の更新に失敗しました");
        return;
      }
      setEditingId(null);
    });
  };

  const handleDelete = (id: number) => {
    setActionError(null);
    startTransition(async () => {
      const res = await deleteTransactionAction(id);
      if (!res.ok) {
        setActionError(res.error ?? "明細の削除に失敗しました");
      }
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            収支明細（{filtered.length}件）
          </h2>
          {activeCategory ? (
            <button
              type="button"
              onClick={() => handleCategorySelect("")}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {activeCategory}
              <X size={12} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 種別フィルタ */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="種別フィルタ">
            {(
              [
                { value: "all", label: "すべて" },
                { value: "expense", label: "支出" },
                { value: "income", label: "収入" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setTypeFilter(tab.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  typeFilter === tab.value
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* カテゴリフィルタ */}
          <select
            aria-label="カテゴリで絞り込み"
            value={activeCategory ?? ""}
            onChange={(e) => handleCategorySelect(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
          >
            <option value="">すべてのカテゴリ</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* キーワード検索 */}
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="メモを検索..."
              aria-label="メモをキーワード検索"
              className="w-40 rounded-lg border border-slate-200 bg-white py-1.5 pr-2.5 pl-8 text-xs text-slate-800 focus:border-slate-400 focus:outline-none sm:w-48"
            />
          </div>
        </div>
      </div>

      {actionError ? (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {actionError}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          条件に一致する収支明細はありません
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((tx) => {
            const isEditing = editingId === tx.id;
            const style = getCategoryStyle(tx.category);
            const isRecurring = tx.billingMonth !== null;

            if (isEditing) {
              const categories = getCategoriesForType(tx.type);
              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-1 gap-2 bg-slate-50/80 px-2 py-3 sm:grid-cols-12 sm:items-center"
                >
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    aria-label="日付"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 sm:col-span-2"
                  />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    aria-label="カテゴリ"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 sm:col-span-3"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    maxLength={MAX_NOTE_LENGTH}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="メモ"
                    aria-label="メモ"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 sm:col-span-3"
                  />
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    aria-label="金額"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs text-slate-900 sm:col-span-2"
                  />
                  <div className="flex items-center justify-end gap-1 sm:col-span-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleSaveEdit(tx)}
                      aria-label="保存"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      aria-label="キャンセル"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={tx.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
                  <time className="w-24 shrink-0 text-xs tabular-nums text-slate-500">
                    {tx.date}
                  </time>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badgeClass}`}
                  >
                    {tx.category}
                  </span>
                  {isRecurring ? (
                    <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                      固定費
                    </span>
                  ) : null}
                  <span className="truncate text-slate-700">
                    {tx.note || <span className="text-slate-300">（メモなし）</span>}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-semibold tabular-nums ${
                      tx.type === "income" ? "text-emerald-700" : "text-slate-900"
                    }`}
                  >
                    {tx.type === "income" ? `+${formatYen(tx.amount)}` : formatYen(tx.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleStartEdit(tx)}
                      aria-label={`${tx.note || tx.category}を編集`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDelete(tx.id)}
                      aria-label={`${tx.note || tx.category}を削除`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

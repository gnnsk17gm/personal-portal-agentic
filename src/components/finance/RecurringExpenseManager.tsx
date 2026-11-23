"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Pencil, Plus, Repeat, Trash2, X } from "lucide-react";
import {
  createRecurringExpenseAction,
  deleteRecurringExpenseAction,
  toggleRecurringExpenseAction,
  updateRecurringExpenseAction,
} from "@/app/finance/actions";
import type { RecurringExpenseRecord } from "@/lib/finance";
import {
  EXPENSE_CATEGORIES,
  MAX_DAY_OF_MONTH,
  MAX_RECURRING_TITLE_LENGTH,
  MIN_DAY_OF_MONTH,
  formatYen,
  getCategoryStyle,
} from "@/lib/finance-constants";

interface RecurringExpenseManagerProps {
  items: RecurringExpenseRecord[];
}

export default function RecurringExpenseManager({ items }: RecurringExpenseManagerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("住居・光熱通信");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [editDay, setEditDay] = useState("1");

  const [pending, startTransition] = useTransition();

  const activeItems = items.filter((item) => item.isActive);
  const activeCount = activeItems.length;
  const activeTotal = activeItems.reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setEditingId(null);
        setError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setError(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("amount", amount);
    formData.set("category", category);
    formData.set("dayOfMonth", dayOfMonth);

    startTransition(async () => {
      const res = await createRecurringExpenseAction(
        { ok: false, error: null, nonce: 0 },
        formData,
      );
      if (!res.ok) {
        setError(res.error ?? "固定費の登録に失敗しました");
        return;
      }
      setTitle("");
      setAmount("");
      setDayOfMonth("1");
    });
  };

  const handleStartEdit = (item: RecurringExpenseRecord) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditAmount(String(item.amount));
    setEditCategory(item.category);
    setEditDay(String(item.dayOfMonth));
    setError(null);
  };

  const handleSaveEdit = (item: RecurringExpenseRecord) => {
    const parsedAmount = Number.parseInt(editAmount.trim(), 10);
    const parsedDay = Number.parseInt(editDay.trim(), 10);
    if (!/^\d+$/.test(editAmount.trim()) || Number.isNaN(parsedAmount) || parsedAmount < 1) {
      setError("金額は1円以上の整数で入力してください");
      return;
    }
    if (
      !/^\d+$/.test(editDay.trim()) ||
      Number.isNaN(parsedDay) ||
      parsedDay < MIN_DAY_OF_MONTH ||
      parsedDay > MAX_DAY_OF_MONTH
    ) {
      setError(`計上日は ${MIN_DAY_OF_MONTH}〜${MAX_DAY_OF_MONTH} 日で指定してください`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await updateRecurringExpenseAction(item.id, {
        title: editTitle,
        amount: parsedAmount,
        category: editCategory,
        dayOfMonth: parsedDay,
        isActive: item.isActive,
      });
      if (!res.ok) {
        setError(res.error ?? "固定費の更新に失敗しました");
        return;
      }
      setEditingId(null);
    });
  };

  const handleToggle = (item: RecurringExpenseRecord) => {
    setError(null);
    startTransition(async () => {
      const res = await toggleRecurringExpenseAction(item.id, !item.isActive);
      if (!res.ok) {
        setError(res.error ?? "状態の切り替えに失敗しました");
      }
    });
  };

  const handleDelete = (id: number) => {
    setError(null);
    startTransition(async () => {
      const res = await deleteRecurringExpenseAction(id);
      if (!res.ok) {
        setError(res.error ?? "固定費の削除に失敗しました");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <Repeat size={14} className="text-slate-500" aria-hidden="true" />
        <span>固定費管理（有効{activeCount}件）</span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]"
          onClick={handleClose}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurring-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <Repeat size={18} className="text-slate-600" aria-hidden="true" />
                <h2 id="recurring-modal-title" className="text-base font-semibold text-slate-900">
                  固定費・サブスク管理
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  有効合計: <strong className="text-slate-900">{formatYen(activeTotal)} / 月</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="モーダルを閉じる"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* モーダル本文 */}
            <div className="overflow-y-auto px-6 py-5">
              <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                ※ マスタの変更・停止・削除は翌月以降の自動計上に適用されます。すでに計上済みの過去・当月明細は維持されます。
              </p>

              {/* 新規登録フォーム */}
              <form
                onSubmit={handleCreate}
                className="mb-5 grid grid-cols-1 gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-12"
              >
                <input
                  type="text"
                  required
                  maxLength={MAX_RECURRING_TITLE_LENGTH}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="名称（例: 家賃, Netflix）"
                  aria-label="固定費の名称"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none sm:col-span-4"
                />
                <input
                  type="number"
                  required
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="金額（円）"
                  aria-label="固定費の金額"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none sm:col-span-2"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="固定費のカテゴリ"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none sm:col-span-3"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 sm:col-span-2">
                  <span className="shrink-0 text-xs text-slate-500">毎月</span>
                  <input
                    type="number"
                    required
                    min={MIN_DAY_OF_MONTH}
                    max={MAX_DAY_OF_MONTH}
                    step={1}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    aria-label="毎月の計上日"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                  />
                  <span className="shrink-0 text-xs text-slate-500">日</span>
                </div>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 sm:col-span-1"
                >
                  <Plus size={15} aria-hidden="true" />
                  <span className="sm:hidden">追加</span>
                </button>
              </form>

              {error ? (
                <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {error}
                </p>
              ) : null}

              {items.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  登録されている固定費・サブスクはまだありません
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const isEditing = editingId === item.id;
                    const style = getCategoryStyle(item.category);

                    if (isEditing) {
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-1 gap-2 bg-slate-50/80 px-2 py-3 sm:grid-cols-12 sm:items-center"
                        >
                          <input
                            type="text"
                            maxLength={MAX_RECURRING_TITLE_LENGTH}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            aria-label="名称"
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 sm:col-span-3"
                          />
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            aria-label="カテゴリ"
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 sm:col-span-3"
                          >
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            aria-label="金額"
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs text-slate-900 sm:col-span-2"
                          />
                          <div className="flex items-center gap-1 sm:col-span-2">
                            <span className="text-xs text-slate-500">毎月</span>
                            <input
                              type="number"
                              min={MIN_DAY_OF_MONTH}
                              max={MAX_DAY_OF_MONTH}
                              step={1}
                              value={editDay}
                              onChange={(e) => setEditDay(e.target.value)}
                              aria-label="計上日"
                              className="w-14 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-center text-xs text-slate-900"
                            />
                            <span className="text-xs text-slate-500">日</span>
                          </div>
                          <div className="flex items-center justify-end gap-1 sm:col-span-2">
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => handleSaveEdit(item)}
                              aria-label="保存"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setError(null);
                              }}
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
                        key={item.id}
                        className={`flex flex-wrap items-center justify-between gap-2 py-3 text-sm ${
                          item.isActive ? "" : "opacity-60"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
                          <span className="font-medium text-slate-900">{item.title}</span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badgeClass}`}
                          >
                            {item.category}
                          </span>
                          <span className="text-xs text-slate-500">毎月 {item.dayOfMonth} 日</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-semibold tabular-nums text-slate-900">
                            {formatYen(item.amount)}
                          </span>

                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => handleToggle(item)}
                            aria-pressed={item.isActive}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                              item.isActive
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {item.isActive ? "有効" : "停止中"}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => handleStartEdit(item)}
                              aria-label={`${item.title}を編集`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => handleDelete(item.id)}
                              aria-label={`${item.title}を削除`}
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
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTransactionAction } from "@/app/finance/actions";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  MAX_NOTE_LENGTH,
  type TransactionType,
} from "@/lib/finance-constants";

interface QuickTransactionFormProps {
  todayDate: string;
  yesterdayDate: string;
}

export default function QuickTransactionForm({
  todayDate,
  yesterdayDate,
}: QuickTransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(todayDate);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [pending, startTransition] = useTransition();

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextCategories = nextType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    setCategory(nextCategories[0]);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);

    const formData = new FormData();
    formData.set("type", type);
    formData.set("amount", amount);
    formData.set("category", category);
    formData.set("date", date);
    formData.set("note", note);

    startTransition(async () => {
      const res = await createTransactionAction({ ok: false, error: null, nonce: 0 }, formData);
      if (!res.ok) {
        setError(res.error ?? "収支の登録に失敗しました");
        return;
      }
      // 連続入力しやすいよう金額・メモのみリセット
      setAmount("");
      setNote("");
      setSavedNotice(true);
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">クイック収支入力</h2>
        <div
          className="inline-flex rounded-lg bg-slate-100 p-0.5"
          role="tablist"
          aria-label="収支種別"
        >
          <button
            type="button"
            role="tab"
            aria-selected={type === "expense"}
            onClick={() => handleTypeChange("expense")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              type === "expense"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            支出
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={type === "income"}
            onClick={() => handleTypeChange("income")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              type === "income"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            収入
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="quick-amount" className="mb-1 block text-xs font-medium text-slate-600">
              金額（円）<span className="text-rose-500">*</span>
            </label>
            <input
              id="quick-amount"
              type="number"
              min={1}
              step={1}
              required
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setSavedNotice(false);
              }}
              placeholder="例: 1200"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="quick-category"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              カテゴリ
            </label>
            <select
              id="quick-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="quick-date" className="text-xs font-medium text-slate-600">
                日付
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDate(todayDate)}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                    date === todayDate
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  今日
                </button>
                <button
                  type="button"
                  onClick={() => setDate(yesterdayDate)}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                    date === yesterdayDate
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  昨日
                </button>
              </div>
            </div>
            <input
              id="quick-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="quick-note" className="mb-1 block text-xs font-medium text-slate-600">
              メモ（任意・最大{MAX_NOTE_LENGTH}文字）
            </label>
            <input
              id="quick-note"
              type="text"
              maxLength={MAX_NOTE_LENGTH}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setSavedNotice(false);
              }}
              placeholder="例: スーパーで食材購入"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="min-h-5 text-xs">
            {error ? <span className="text-rose-600">{error}</span> : null}
            {!error && savedNotice ? (
              <span className="text-emerald-600">登録しました</span>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            <Plus size={16} aria-hidden="true" />
            {pending ? "保存中..." : type === "expense" ? "支出を登録" : "収入を登録"}
          </button>
        </div>
      </form>
    </section>
  );
}

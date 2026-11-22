"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Trash2 } from "lucide-react";

const SCRATCHPAD_STORAGE_KEY = "portal_quick_scratchpad";

const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SCRATCHPAD_STORAGE_KEY || event.key === null) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(SCRATCHPAD_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerSnapshot(): string {
  return "";
}

function saveScratchpad(value: string): void {
  try {
    if (value === "") {
      window.localStorage.removeItem(SCRATCHPAD_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SCRATCHPAD_STORAGE_KEY, value);
    }
  } catch {
    // ストレージ容量超過やプライベートモード制限時は無視してUI操作を継続する
  }
  emitChange();
}

/**
 * ブラウザの localStorage に自動保存される付箋・伝言板（Scratchpad）。
 * DB 永続化の Notes とは異なり、一時的なメモや伝言を気軽に書ける自宅用タイル。
 */
export default function QuickScratchpad() {
  const text = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [hasSaved, setHasSaved] = useState(false);

  const handleChange = (value: string) => {
    saveScratchpad(value);
    setHasSaved(true);
  };

  const handleClear = () => {
    saveScratchpad("");
    setHasSaved(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="買い物メモやちょっとした伝言を自由に記入（自動保存）..."
        aria-label="Quick Scratchpad"
        className="min-h-0 w-full flex-1 resize-none rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-sm leading-relaxed text-slate-800 placeholder:text-amber-700/40 focus:border-amber-300 focus:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200/60"
      />
      <div className="flex shrink-0 items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          {hasSaved || text.length > 0 ? (
            <>
              <Check size={12} className="text-emerald-500" aria-hidden="true" />
              <span>ブラウザに保存済み（{text.length}文字）</span>
            </>
          ) : (
            <span>入力すると自動保存されます</span>
          )}
        </span>
        {text.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="スクラッチパッドをクリア"
          >
            <Trash2 size={12} aria-hidden="true" />
            <span>クリア</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

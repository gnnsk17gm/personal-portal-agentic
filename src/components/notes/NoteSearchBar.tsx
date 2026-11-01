import { Search } from "lucide-react";

export default function NoteSearchBar({ query }: { query: string }) {
  return (
    <form action="/notes" method="get" role="search" className="flex items-center gap-2">
      <label htmlFor="note-search" className="sr-only">
        ノートを検索
      </label>
      <div className="relative flex-1">
        <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="note-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="キーワードで検索..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        検索
      </button>
    </form>
  );
}

import type { AgentContextFile } from "@/types/portal";

function formatBytes(size: number): string {
  return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
}

export default function AgentFileCard({ file }: { file: AgentContextFile }) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-slate-50 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate font-medium text-slate-900">{file.name}</span>
          <span className="block truncate text-xs text-slate-500">{file.path}</span>
        </span>
        <span className="shrink-0 text-xs text-slate-500">
          {file.charCount.toLocaleString("ja-JP")} 文字 / {formatBytes(file.size)}
        </span>
      </summary>
      <div className="border-t border-slate-200 p-4">
        {file.truncated ? (
          <p className="mb-2 text-xs text-amber-700">サイズ上限（200KB）を超えるため先頭のみ表示しています</p>
        ) : null}
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
          {file.content}
        </pre>
      </div>
    </details>
  );
}

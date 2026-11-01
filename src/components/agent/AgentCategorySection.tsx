import AgentFileCard from "@/components/agent/AgentFileCard";
import type { AgentContextFile } from "@/types/portal";

interface AgentCategorySectionProps {
  title: string;
  description: string;
  files: AgentContextFile[];
}

export default function AgentCategorySection({ title, description, files }: AgentCategorySectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-900">
          {title}
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {files.length}
          </span>
        </h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {files.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">ファイルがありません</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <AgentFileCard key={file.path} file={file} />
          ))}
        </div>
      )}
    </section>
  );
}

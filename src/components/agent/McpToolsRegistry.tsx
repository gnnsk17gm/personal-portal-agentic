import McpToolCard from '@/components/agent/McpToolCard';
import type { McpToolDefinition } from '@/types/mcp';

interface McpToolsRegistryProps {
  tools: McpToolDefinition[];
}

export default function McpToolsRegistry({ tools }: McpToolsRegistryProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">MCP Tools Registry</h2>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
              Active ({tools.length})
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            AIエージェント向けに公開されている Model Context Protocol 準拠のツール定義一覧
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 self-start sm:self-auto">
          <span className="text-slate-500">Endpoint:</span>
          <span className="font-semibold text-indigo-600">POST /api/mcp</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tools.map((tool) => (
          <McpToolCard key={tool.name} tool={tool} />
        ))}
      </div>
    </section>
  );
}

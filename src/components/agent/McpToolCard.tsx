import type { McpToolDefinition } from '@/types/mcp';

interface McpToolCardProps {
  tool: McpToolDefinition;
}

export default function McpToolCard({ tool }: McpToolCardProps) {
  const properties = Object.entries(tool.inputSchema.properties);
  const requiredFields = new Set(tool.inputSchema.required ?? []);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            {tool.name}
          </span>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {properties.length} {properties.length === 1 ? 'argument' : 'arguments'}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-700 leading-relaxed">
        {tool.description}
      </p>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Parameters (JSON Schema)
        </h4>

        {properties.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500 italic">No parameters required.</p>
        ) : (
          <div className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-100 bg-slate-50/50">
            {properties.map(([propName, propDef]) => {
              const isRequired = requiredFields.has(propName);
              return (
                <div key={propName} className="p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-medium text-slate-900">{propName}</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-indigo-600">{propDef.type}</span>
                    </div>
                    {isRequired ? (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 border border-rose-100">
                        required
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">optional</span>
                    )}
                  </div>
                  {propDef.description && (
                    <p className="mt-1 text-slate-600">{propDef.description}</p>
                  )}
                  {propDef.enum && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-500">Allowed:</span>
                      {propDef.enum.map((val) => (
                        <code
                          key={val}
                          className="rounded bg-slate-200/70 px-1 py-0.2 text-[10px] text-slate-700"
                        >
                          &quot;{val}&quot;
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <details className="mt-3 text-xs text-slate-500">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors">
          View Raw Input Schema
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-900 p-2.5 font-mono text-[11px] text-slate-200">
          {JSON.stringify(tool.inputSchema, null, 2)}
        </pre>
      </details>
    </div>
  );
}

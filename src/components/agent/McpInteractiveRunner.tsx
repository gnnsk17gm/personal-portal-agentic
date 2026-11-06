'use client';

import { useState } from 'react';
import { buildToolsCallPayload, parseRunnerFormValues } from '@/lib/mcpRunner';
import type { JsonRpcResponse, McpToolDefinition } from '@/types/mcp';

interface McpInteractiveRunnerProps {
  tool: McpToolDefinition;
}

interface ExecutionResult {
  statusCode: number;
  requestPayload: unknown;
  responsePayload: JsonRpcResponse | null;
  errorText?: string;
  timestamp: string;
}

export default function McpInteractiveRunner({ tool }: McpInteractiveRunnerProps) {
  const properties = Object.entries(tool.inputSchema?.properties ?? {});
  const requiredSet = new Set(tool.inputSchema?.required ?? []);

  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [key, propDef] of properties) {
      if (propDef.enum && propDef.enum.length > 0) {
        initial[key] = propDef.enum[0];
      } else {
        initial[key] = '';
      }
    }
    return initial;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isSuccessMessageVisible, setIsSuccessMessageVisible] = useState(false);

  const handleInputChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccessMessageVisible(false);

    const parsedArgs = parseRunnerFormValues(tool, formValues);
    const requestPayload = buildToolsCallPayload(tool.name, parsedArgs);

    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const responseJson: JsonRpcResponse = await response.json();

      setResult({
        statusCode: response.status,
        requestPayload,
        responsePayload: responseJson,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (response.ok && !responseJson.error) {
        setIsSuccessMessageVisible(true);
      }
    } catch (err) {
      setResult({
        statusCode: 0,
        requestPayload,
        responsePayload: null,
        errorText: err instanceof Error ? err.message : 'ネットワーク通信エラーが発生しました',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          Interactive Test Runner
        </h5>
        <span className="text-[10px] text-slate-400 font-mono">POST /api/mcp</span>
      </div>

      <form onSubmit={handleExecute} className="mt-3 space-y-3">
        {properties.length === 0 ? (
          <p className="text-xs text-slate-500 italic">引数は不要です（そのまま実行可能）</p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {properties.map(([propName, propDef]) => {
              const isRequired = requiredSet.has(propName);
              const inputId = `param-${tool.name}-${propName}`;

              return (
                <div key={propName} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={inputId}
                      className="font-mono text-xs font-medium text-slate-700"
                    >
                      {propName}
                      {isRequired && <span className="text-rose-500 ml-0.5">*</span>}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {propDef.type}
                    </span>
                  </div>

                  {propDef.enum && propDef.enum.length > 0 ? (
                    <select
                      id={inputId}
                      value={formValues[propName] ?? ''}
                      onChange={(e) => handleInputChange(propName, e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {propDef.enum.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={inputId}
                      type={propDef.type === 'number' || propDef.type === 'integer' ? 'number' : 'text'}
                      value={formValues[propName] ?? ''}
                      onChange={(e) => handleInputChange(propName, e.target.value)}
                      placeholder={propDef.description ?? `${propName}を入力`}
                      required={isRequired}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                実行中...
              </>
            ) : (
              <>
                <span>▶ 実行 (Execute)</span>
              </>
            )}
          </button>

          {isSuccessMessageVisible && (
            <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              ✓ 正常完了
            </span>
          )}
        </div>
      </form>

      {result && (
        <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-900 p-3 text-slate-200">
          <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
            <span className="font-mono text-slate-400">Response ({result.timestamp})</span>
            <span
              className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                result.statusCode === 200 && !result.responsePayload?.error
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              Status: {result.statusCode || 'ERR'}
            </span>
          </div>

          {result.errorText && (
            <div className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900/50">
              {result.errorText}
            </div>
          )}

          {result.responsePayload && (
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                JSON-RPC Result
              </div>
              <pre className="max-h-56 overflow-auto font-mono text-[11px] text-emerald-300 leading-tight">
                {JSON.stringify(result.responsePayload, null, 2)}
              </pre>
            </div>
          )}

          <details className="pt-1">
            <summary className="cursor-pointer text-[10px] text-slate-500 hover:text-slate-400">
              リクエストペイロードを確認
            </summary>
            <pre className="mt-1 max-h-36 overflow-auto font-mono text-[10px] text-slate-400">
              {JSON.stringify(result.requestPayload, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

import AgentCategorySection from "@/components/agent/AgentCategorySection";
import McpToolsRegistry from "@/components/agent/McpToolsRegistry";
import { getAgentContext } from "@/services/agentContextService";
import { listTools } from "@/services/mcpService";
import type { AgentContextCategory } from "@/types/portal";

export const dynamic = "force-dynamic";

const SECTIONS: { category: AgentContextCategory; title: string; description: string }[] = [
  { category: "rules", title: "Rules", description: ".antigravity/rules/*.md — エージェントの行動規範" },
  { category: "skills", title: "Skills", description: ".antigravity/skills/*.md — 作業手順書" },
  { category: "hooks", title: "Hooks", description: ".antigravity/hooks/* — 自動検証スクリプト" },
  { category: "specs-active", title: "Specs (Active)", description: "specs/active/*.md — 進行中の仕様書" },
  { category: "specs-completed", title: "Specs (Completed)", description: "specs/completed/*.md — 完了済みの仕様書" },
  { category: "adrs", title: "ADRs", description: "docs/adr/*.md — アーキテクチャ決定記録" },
];

export default async function AgentPage() {
  const [files, tools] = await Promise.all([
    getAgentContext(),
    Promise.resolve(listTools()),
  ]);

  return (
    <div className="space-y-6">
      <McpToolsRegistry tools={tools} />

      {SECTIONS.map((s) => (
        <AgentCategorySection
          key={s.category}
          title={s.title}
          description={s.description}
          files={files.filter((f) => f.category === s.category)}
        />
      ))}
    </div>
  );
}

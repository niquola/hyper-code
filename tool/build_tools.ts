// Build AgentTool[] from ctx.tool namespace + ctx._meta.tool metadata

import type { AgentTool } from "../agent_type_Tool.ts";

export default function build_tools(ctx: any): AgentTool[] {
  const tools: AgentTool[] = [];
  const ns = ctx.tool;
  const meta = ctx._meta?.tool || {};
  if (!ns) return tools;

  for (const [key, fn] of Object.entries(ns)) {
    if (typeof fn !== "function") continue;
    const m = meta[key];
    if (!m || !m.description) continue; // skip helpers without tool metadata
    tools.push({
      name: m.name || key,
      description: m.description || "",
      parameters: m.parameters || {},
      execute: fn as any,
    });
  }

  return tools;
}

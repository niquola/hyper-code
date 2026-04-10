import type { Model } from "./ai_type_Model.ts";
import type { ModelIndex } from "./ai_type_ModelIndex.ts";
import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { chat_db } from "./chat_db.ts";

export function agent_createCtx(opts: {
  model: Model;
  apiKey: string;
  systemPrompt?: string;
  tools?: AgentTool[];
  db?: ReturnType<typeof chat_db>;
  cwd?: string;
  home?: string;
  env?: Record<string, string | undefined>;
  modelIndex?: ModelIndex;
  modelProviders?: Map<string, Record<string, Model>>;
  modelAll?: Record<string, Model> | null;
}): Ctx {
  return {
    model: opts.model,
    apiKey: opts.apiKey,
    systemPrompt: opts.systemPrompt ?? "",
    tools: opts.tools ?? [],
    db: opts.db ?? null as any,
    cwd: opts.cwd ?? ".",
    home: opts.home ?? (process.env.HOME || process.env.USERPROFILE || "/tmp"),
    env: opts.env ?? (process.env as Record<string, string | undefined>),
    modelIndex: opts.modelIndex ?? { providers: [] },
    modelProviders: opts.modelProviders ?? new Map(),
    modelAll: opts.modelAll ?? null,
  };
}

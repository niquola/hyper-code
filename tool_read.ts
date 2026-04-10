import { resolve } from "node:path";
import { homedir } from "node:os";
import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import { tool_truncateOutput } from "./tool_truncate.ts";

function resolvePath(path: string, cwd: string): string {
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  if (path.startsWith("/")) return path;
  return resolve(cwd, path);
}

export function tool_read(cwd: string): AgentTool {
  return {
    name: "read",
    description: "Read a file. Returns file contents. Use offset/limit for large files.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path (relative to working directory or absolute)" },
        offset: { type: "number", description: "Line number to start from (1-indexed)" },
        limit: { type: "number", description: "Max number of lines to read" },
      },
      required: ["path"],
    },
    execute: async (ctx: Ctx, session: Session, params: { path: string; offset?: number; limit?: number }, signal) => {
      const abs = resolvePath(params.path, cwd);
      const file = Bun.file(abs);
      if (!await file.exists()) throw new Error(`File not found: ${params.path}`);
      const raw = await file.text();
      let lines = raw.split("\n");
      const totalLines = lines.length;

      if (params.offset && params.offset > 1) {
        lines = lines.slice(params.offset - 1);
      }
      if (params.limit) {
        lines = lines.slice(0, params.limit);
      }

      const startLine = params.offset || 1;
      const numbered = lines.map((l, i) => `${startLine + i}\t${l}`).join("\n");

      const { text } = tool_truncateOutput(numbered, 2000, 50_000, "head");

      return { content: [{ type: "text", text }] };
    },
  };
}

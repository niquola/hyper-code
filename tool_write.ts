import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { mkdir } from "node:fs/promises";
import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";

function resolvePath(path: string, cwd: string): string {
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  if (path.startsWith("/")) return path;
  return resolve(cwd, path);
}

export function tool_write(cwd: string): AgentTool {
  return {
    name: "write",
    description: "Create or overwrite a file with the given content.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "File content to write" },
      },
      required: ["path", "content"],
    },
    execute: async (ctx: Ctx, session: Session, params: { path: string; content: string }) => {
      const abs = resolvePath(params.path, cwd);
      await mkdir(dirname(abs), { recursive: true });
      await Bun.write(abs, params.content);
      const bytes = Buffer.byteLength(params.content, "utf-8");
      return { content: [{ type: "text", text: `Wrote ${bytes} bytes to ${params.path}` }] };
    },
  };
}

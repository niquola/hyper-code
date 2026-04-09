import { resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";
import type { AgentTool } from "./agent_type_Tool.ts";

export function tool_ls(cwd: string): AgentTool {
  return {
    name: "ls",
    description: "List directory contents. Shows files and subdirectories.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path (default: working directory)" },
      },
    },
    execute: async (_ctx: any, _session: any, params: { path?: string }) => {
      const dir = params.path ? resolve(cwd, params.path) : cwd;

      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        if (entries.length === 0) {
          return { content: [{ type: "text", text: "(empty directory)" }] };
        }

        entries.sort((a, b) => {
          // Directories first, then files
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });

        const lines = entries.map((e) => {
          if (e.isDirectory()) return e.name + "/";
          try {
            const size = statSync(resolve(dir, e.name)).size;
            return `${e.name}  (${formatSize(size)})`;
          } catch {
            return e.name;
          }
        });

        let text = lines.join("\n");
        if (entries.length >= 500) {
          text += "\n\n[Truncated: showing first 500 entries]";
        }

        return { content: [{ type: "text", text }] };
      } catch (err: any) {
        if (err.code === "ENOENT") {
          return { content: [{ type: "text", text: `Directory not found: ${params.path || "."}` }] };
        }
        throw err;
      }
    },
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

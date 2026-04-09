import { resolve } from "node:path";
import type { AgentTool } from "./agent_type_Tool.ts";

export function tool_find(cwd: string): AgentTool {
  return {
    name: "find",
    description: "Find files by glob pattern. Returns matching file paths.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Glob pattern (e.g. '*.ts', '**/*.json', 'src/**/*.tsx')" },
        path: { type: "string", description: "Directory to search in (default: working directory)" },
      },
      required: ["pattern"],
    },
    execute: async (_ctx: any, _session: any, params: { pattern: string; path?: string }) => {
      const searchDir = params.path ? resolve(cwd, params.path) : cwd;
      const glob = new Bun.Glob(params.pattern);
      const matches: string[] = [];

      for (const path of glob.scanSync({ cwd: searchDir })) {
        matches.push(path);
        if (matches.length >= 1000) break;
      }

      if (matches.length === 0) {
        return { content: [{ type: "text", text: "No files found." }] };
      }

      matches.sort();
      let text = matches.join("\n");
      if (matches.length >= 1000) {
        text += "\n\n[Truncated: showing first 1000 results]";
      }

      return { content: [{ type: "text", text }] };
    },
  };
}

import { resolve } from "node:path";
import type { AgentTool } from "./agent_type_Tool.ts";

export function tool_grep(cwd: string): AgentTool {
  return {
    name: "grep",
    description: "Search file contents using regex or literal pattern. Returns matching lines with file paths and line numbers.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex or literal search pattern" },
        path: { type: "string", description: "Directory or file to search in (default: working directory)" },
        glob: { type: "string", description: "Filter files by glob pattern (e.g. '*.ts', '*.json')" },
        ignoreCase: { type: "boolean", description: "Case insensitive search" },
      },
      required: ["pattern"],
    },
    execute: async (_ctx: any, _session: any, params: { pattern: string; path?: string; glob?: string; ignoreCase?: boolean }) => {
      const searchPath = params.path ? resolve(cwd, params.path) : cwd;

      const args = ["rg", "--no-heading", "--line-number", "--color=never"];
      if (params.ignoreCase) args.push("-i");
      if (params.glob) args.push("--glob", params.glob);
      args.push("--max-count=100");
      args.push(params.pattern, searchPath);

      const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", cwd });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);

      if (exitCode === 1 && !stdout.trim()) {
        return { content: [{ type: "text", text: "No matches found." }] };
      }

      if (exitCode > 1) {
        return { content: [{ type: "text", text: `grep error: ${stderr || "unknown error"}` }] };
      }

      // Make paths relative to cwd
      let output = stdout;
      if (output.includes(cwd)) {
        output = output.replaceAll(cwd + "/", "");
      }

      // Truncate if too long
      const lines = output.split("\n");
      if (lines.length > 500) {
        output = lines.slice(0, 500).join("\n") + `\n\n[Truncated: showing 500 of ${lines.length} matches]`;
      }

      return { content: [{ type: "text", text: output.trim() }] };
    },
  };
}

import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import { tool_truncateOutput } from "./tool_truncate.ts";

export function tool_bash(cwd: string): AgentTool {
  return {
    name: "bash",
    description: "Execute a bash command. Returns stdout+stderr and exit code.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Bash command to execute" },
        timeout: { type: "number", description: "Timeout in seconds (default: 30)" },
      },
      required: ["command"],
    },
    execute: async (_ctx: Ctx, _session: Session, params: { command: string; timeout?: number }, signal) => {
      const timeout = (params.timeout || 30) * 1000;

      const proc = Bun.spawn(["bash", "-c", params.command], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, TERM: "dumb" },
      });

      const timer = setTimeout(() => proc.kill(), timeout);
      signal?.addEventListener("abort", () => proc.kill());

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);

      clearTimeout(timer);

      const { text: output } = tool_truncateOutput(stdout + stderr, 2000, 50_000, "tail");
      const text = output + (exitCode !== 0 ? `\n\nExit code: ${exitCode}` : "");
      return { content: [{ type: "text", text }] };
    },
  };
}

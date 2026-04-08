import type { AgentTool } from "./agent_type_Tool.ts";

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
    execute: async (params: { command: string; timeout?: number }, signal) => {
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

      let output = stdout + stderr;
      const MAX = 50_000;
      if (output.length > MAX) {
        output = output.slice(-MAX) + "\n\n[Truncated: showing last 50KB]";
      }

      const text = output + (exitCode !== 0 ? `\n\nExit code: ${exitCode}` : "");
      return { content: [{ type: "text", text }] };
    },
  };
}

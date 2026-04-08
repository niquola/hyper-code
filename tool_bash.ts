import { spawn } from "node:child_process";
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

      return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        const proc = spawn("bash", ["-c", params.command], {
          cwd,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, TERM: "dumb" },
        });

        const timer = setTimeout(() => {
          proc.kill("SIGTERM");
          setTimeout(() => proc.kill("SIGKILL"), 1000);
        }, timeout);

        signal?.addEventListener("abort", () => {
          proc.kill("SIGTERM");
        });

        proc.stdout?.on("data", (d: Buffer) => chunks.push(d));
        proc.stderr?.on("data", (d: Buffer) => chunks.push(d));

        proc.on("close", (code) => {
          clearTimeout(timer);
          let output = Buffer.concat(chunks).toString("utf-8");

          // Truncate if too long
          const MAX = 50_000;
          if (output.length > MAX) {
            output = output.slice(-MAX) + "\n\n[Truncated: showing last 50KB]";
          }

          const text = output + (code !== 0 ? `\n\nExit code: ${code}` : "");
          resolve({ content: [{ type: "text", text }] });
        });

        proc.on("error", (err) => {
          clearTimeout(timer);
          resolve({ content: [{ type: "text", text: `Error: ${err.message}` }] });
        });
      });
    },
  };
}

import { tool_truncateOutput } from "../tool_truncate.ts";

export const name = "bash";
export const description = "Execute a bash command. Returns stdout+stderr and exit code.";
export const parameters = {
  type: "object",
  properties: {
    command: { type: "string", description: "Bash command to execute" },
    timeout: { type: "number", description: "Timeout in seconds (default: 30)" },
  },
  required: ["command"],
};

export default async function bash(ctx: Ctx, session: any, params: { command: string; timeout?: number }, signal?: AbortSignal) {
  const timeout = (params.timeout || 30) * 1000;

  const proc = Bun.spawn(["bash", "-c", params.command], {
    cwd: ctx.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: ctx.env as Record<string, string>,
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
  return { content: [{ type: "text" as const, text }] };
}

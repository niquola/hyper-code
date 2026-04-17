import type { HyperUIRequest } from "./type_Request.ts";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

export type { HyperUIRequest } from "./type_Request.ts";

const RUNNERS: Record<string, string[]> = {
  ts: ["bun"],
  js: ["bun"],
  py: ["python3"],
  sh: ["bash"],
};

export async function hyper_ui_run(
  cwd: string,
  name: string,
  req: HyperUIRequest,
): Promise<string> {
  // Find the script file
  const scriptFile = findScript(cwd, name);
  if (!scriptFile) {
    return `<div class="text-red-600 text-sm">Widget "${name}" not found</div>`;
  }

  const ext = scriptFile.split(".").pop()!;
  const runner = RUNNERS[ext];
  if (!runner) {
    return `<div class="text-red-600 text-sm">Unsupported script type: .${ext}</div>`;
  }

  const absPath = resolve(cwd, scriptFile);
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    REQUEST_METHOD: req.method,
    PATH_INFO: req.path,
    QUERY_STRING: req.query,
    WORKSPACE_DIR: cwd,
    HYPER_UI_ID: `hyper-ui-${name}`,
  };

  try {
    const proc = Bun.spawn([...runner, absPath], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      stdin: new Response(req.body),
      env,
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    if (exitCode !== 0) {
      return `<div class="text-red-600 text-sm">Widget error (exit ${exitCode}): ${Bun.escapeHTML(stderr || stdout)}</div>`;
    }

    return stdout;
  } catch (err: any) {
    return `<div class="text-red-600 text-sm">Widget error: ${Bun.escapeHTML(err.message)}</div>`;
  }
}

function findScript(cwd: string, name: string): string | null {
  const extensions = Object.keys(RUNNERS);
  for (const ext of extensions) {
    const filename = `hyper_ui_${name}.${ext}`;
    try {
      const entries = readdirSync(cwd);
      if (entries.includes(filename)) return filename;
    } catch {}
  }
  return null;
}

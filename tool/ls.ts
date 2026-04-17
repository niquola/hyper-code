import { resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";

export const name = "ls";
export const description = "List directory contents. Shows files and subdirectories.";
export const parameters = {
  type: "object",
  properties: {
    path: { type: "string", description: "Directory path (default: working directory)" },
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default async function ls(ctx: Ctx, session: any, params: { path?: string }) {
  const dir = params.path ? resolve(ctx.cwd, params.path) : ctx.cwd;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    if (entries.length === 0) return { content: [{ type: "text" as const, text: "(empty directory)" }] };

    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const lines = entries.map((e) => {
      if (e.isDirectory()) return e.name + "/";
      try { return `${e.name}  (${formatSize(statSync(resolve(dir, e.name)).size)})`; } catch { return e.name; }
    });

    let text = lines.join("\n");
    if (entries.length >= 500) text += "\n\n[Truncated: showing first 500 entries]";
    return { content: [{ type: "text" as const, text }] };
  } catch (err: any) {
    if (err.code === "ENOENT") return { content: [{ type: "text" as const, text: `Directory not found: ${params.path || "."}` }] };
    throw err;
  }
}

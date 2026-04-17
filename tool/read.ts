import { resolve } from "node:path";

function resolvePath(path: string, home: string, cwd: string): string {
  if (path.startsWith("~/")) return resolve(home, path.slice(2));
  if (path.startsWith("/")) return path;
  return resolve(cwd, path);
}

export const name = "read";
export const description = "Read a file. Returns file contents. Use offset/limit for large files.";
export const parameters = {
  type: "object",
  properties: {
    path: { type: "string", description: "File path (relative to working directory or absolute)" },
    offset: { type: "number", description: "Line number to start from (1-indexed)" },
    limit: { type: "number", description: "Max number of lines to read" },
  },
  required: ["path"],
};

export default async function read(ctx: Ctx, session: any, params: { path: string; offset?: number; limit?: number }) {
  const abs = resolvePath(params.path, ctx.home, ctx.cwd);
  const file = Bun.file(abs);
  if (!await file.exists()) throw new Error(`File not found: ${params.path}`);
  const raw = await file.text();
  let lines = raw.split("\n");

  if (params.offset && params.offset > 1) {
    lines = lines.slice(params.offset - 1);
  }
  if (params.limit) {
    lines = lines.slice(0, params.limit);
  }

  const startLine = params.offset || 1;
  const numbered = lines.map((l, i) => `${startLine + i}\t${l}`).join("\n");
  const { text } = ctx.tool.truncate(numbered, 2000, 50_000, "head");

  return { content: [{ type: "text" as const, text }] };
}

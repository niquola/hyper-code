import { resolve, dirname } from "node:path";
import { mkdir } from "node:fs/promises";

function resolvePath(path: string, home: string, cwd: string): string {
  if (path.startsWith("~/")) return resolve(home, path.slice(2));
  if (path.startsWith("/")) return path;
  return resolve(cwd, path);
}

export const name = "write";
export const description = "Create or overwrite a file with the given content.";
export const parameters = {
  type: "object",
  properties: {
    path: { type: "string", description: "File path" },
    content: { type: "string", description: "File content to write" },
  },
  required: ["path", "content"],
};

export default async function write(ctx: Ctx, session: any, params: { path: string; content: string }) {
  const abs = resolvePath(params.path, ctx.home, ctx.cwd);
  await mkdir(dirname(abs), { recursive: true });
  await Bun.write(abs, params.content);
  const bytes = Buffer.byteLength(params.content, "utf-8");
  return { content: [{ type: "text" as const, text: `Wrote ${bytes} bytes to ${params.path}` }] };
}

import { resolve } from "node:path";

function resolvePath(path: string, home: string, cwd: string): string {
  if (path.startsWith("~/")) return resolve(home, path.slice(2));
  if (path.startsWith("/")) return path;
  return resolve(cwd, path);
}

export const name = "edit";
export const description = "Edit a file by replacing exact text matches. Each oldText must be unique in the file.";
export const parameters = {
  type: "object",
  properties: {
    path: { type: "string", description: "File path" },
    edits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          oldText: { type: "string", description: "Exact text to find (must be unique)" },
          newText: { type: "string", description: "Replacement text" },
        },
        required: ["oldText", "newText"],
      },
      description: "List of edits to apply",
    },
  },
  required: ["path", "edits"],
};

export default async function edit(ctx: Ctx, session: any, params: { path: string; edits: { oldText: string; newText: string }[] }) {
  const abs = resolvePath(params.path, ctx.home, ctx.cwd);
  let content = await Bun.file(abs).text();

  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

  for (const e of params.edits) {
    const count = content.split(e.oldText).length - 1;
    if (count === 0) return { content: [{ type: "text" as const, text: `Error: oldText not found in ${params.path}:\n${e.oldText.slice(0, 200)}` }] };
    if (count > 1) return { content: [{ type: "text" as const, text: `Error: oldText found ${count} times in ${params.path} (must be unique):\n${e.oldText.slice(0, 200)}` }] };
    content = content.replace(e.oldText, e.newText);
  }

  await Bun.write(abs, content);

  const diffLines = params.edits.map((e, i) => {
    const label = params.edits.length > 1 ? `Edit ${i + 1}:\n` : "";
    const oldLines = e.oldText.split("\n").map(l => `- ${l}`).join("\n");
    const newLines = e.newText.split("\n").map(l => `+ ${l}`).join("\n");
    return `${label}${oldLines}\n${newLines}`;
  }).join("\n\n");

  return { content: [{ type: "text" as const, text: `Applied ${params.edits.length} edit(s) to ${params.path}\n\n${diffLines}` }] };
}

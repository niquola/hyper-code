import { resolve } from "node:path";
import { homedir } from "node:os";
import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";

function resolvePath(path: string, cwd: string): string {
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  if (path.startsWith("/")) return path;
  return resolve(cwd, path);
}

export function tool_edit(cwd: string): AgentTool {
  return {
    name: "edit",
    description: "Edit a file by replacing exact text matches. Each oldText must be unique in the file.",
    parameters: {
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
    },
    execute: async (ctx: Ctx, session: Session, params: { path: string; edits: { oldText: string; newText: string }[] }) => {
      const abs = resolvePath(params.path, cwd);
      let content = await Bun.file(abs).text();

      // Strip BOM
      if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

      for (const edit of params.edits) {
        const count = content.split(edit.oldText).length - 1;
        if (count === 0) {
          return { content: [{ type: "text" as const, text: `Error: oldText not found in ${params.path}:\n${edit.oldText.slice(0, 200)}` }] };
        }
        if (count > 1) {
          return { content: [{ type: "text" as const, text: `Error: oldText found ${count} times in ${params.path} (must be unique):\n${edit.oldText.slice(0, 200)}` }] };
        }
        content = content.replace(edit.oldText, edit.newText);
      }

      await Bun.write(abs, content);

      // Build diff summary
      const diffLines = params.edits.map((e, i) => {
        const label = params.edits.length > 1 ? `Edit ${i + 1}:\n` : "";
        const oldLines = e.oldText.split("\n").map(l => `- ${l}`).join("\n");
        const newLines = e.newText.split("\n").map(l => `+ ${l}`).join("\n");
        return `${label}${oldLines}\n${newLines}`;
      }).join("\n\n");

      return { content: [{ type: "text", text: `Applied ${params.edits.length} edit(s) to ${params.path}\n\n${diffLines}` }] };
    },
  };
}

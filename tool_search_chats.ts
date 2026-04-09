import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import { getDb } from "./chat_db.ts";

export function tool_search_chats(): AgentTool {
  return {
    name: "search_chats",
    description: "Search across all chat sessions by message content. Useful to find previous discussions, decisions, or code references.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search for in messages" },
        role: { type: "string", enum: ["user", "assistant", "toolResult"], description: "Filter by message role. Omit to search all." },
        limit: { type: "number", description: "Max results. Default: 20" },
      },
      required: ["query"],
    },
    execute: async (ctx: Ctx, session: Session, params: { query: string; role?: string; limit?: number }) => {
      const db = getDb();
      const results = db.searchMessages(params.query, params.role, params.limit || 20);

      if (results.length === 0) {
        return { content: [{ type: "text", text: `No messages found matching "${params.query}"` }] };
      }

      const lines = results.map((r) => {
        const date = new Date(r.timestamp).toISOString().slice(0, 16).replace("T", " ");
        return `[${date}] ${r.sessionTitle} (${r.role}): ${r.content.slice(0, 200)}`;
      });

      return {
        content: [{ type: "text", text: `Found ${results.length} messages:\n\n${lines.join("\n")}` }],
      };
    },
  };
}

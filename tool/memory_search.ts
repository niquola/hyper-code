export const name = "memory_search";
export const description = "Search across all chat sessions using full-text search (BM25 ranked, recency-boosted). Find previous discussions, decisions, code references.";
export const parameters = {
  type: "object",
  properties: {
    query: { type: "string", description: "Search query — keywords or phrases" },
    role: { type: "string", enum: ["user", "assistant", "toolResult"], description: "Filter by message role. Default: all roles." },
    limit: { type: "number", description: "Max results. Default: 20" },
  },
  required: ["query"],
};

export default async function memory_search(ctx: Ctx, session: any, params: { query: string; role?: string; limit?: number }) {
  const results = ctx.db.searchMessages(params.query, params.role, params.limit || 20);

  if (results.length === 0) {
    return { content: [{ type: "text" as const, text: `No messages found for "${params.query}"` }] };
  }

  const lines = results.map((r: any) => {
    const date = new Date(r.timestamp).toISOString().slice(0, 16).replace("T", " ");
    const snippet = r.content.length > 200 ? r.content.slice(0, 200) + "..." : r.content;
    return `[${date}] (${r.role}) ${r.sessionTitle}: ${snippet}`;
  });

  return { content: [{ type: "text" as const, text: `Found ${results.length} messages:\n\n${lines.join("\n\n")}` }] };
}

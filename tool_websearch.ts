import type { AgentTool } from "./agent_type_Tool.ts";
import { tool_truncateOutput } from "./tool_truncate.ts";

export function tool_websearch(): AgentTool {
  return {
    name: "websearch",
    description: "Search the web using Tavily (app.tavily.com). Returns a text summary of results.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        max_results: { type: "number", description: "Max results to return (default: 5)" },
        search_depth: { type: "string", enum: ["basic", "advanced"], description: "Search depth (default: basic)" },
        include_domains: { type: "array", items: { type: "string" }, description: "Domains to include" },
        exclude_domains: { type: "array", items: { type: "string" }, description: "Domains to exclude" },
        include_answer: { type: "boolean", description: "Include Tavily answer summary (default: true)" },
        include_raw_content: { type: "boolean", description: "Include raw content (default: false)" },
      },
      required: ["query"],
    },
    execute: async (_ctx: any, _session: any, params: {
      query: string;
      max_results?: number;
      search_depth?: "basic" | "advanced";
      include_domains?: string[];
      exclude_domains?: string[];
      include_answer?: boolean;
      include_raw_content?: boolean;
    }, signal) => {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return { content: [{ type: "text", text: "Missing TAVILY_API_KEY environment variable." }] };
      }

      const body = {
        api_key: apiKey,
        query: params.query,
        max_results: params.max_results ?? 5,
        search_depth: params.search_depth ?? "basic",
        include_domains: params.include_domains,
        exclude_domains: params.exclude_domains,
        include_answer: params.include_answer ?? true,
        include_raw_content: params.include_raw_content ?? false,
      };

      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return { content: [{ type: "text", text: `Tavily error: ${res.status} ${res.statusText}${errText ? `\n${errText}` : ""}` }] };
      }

      const data = await res.json().catch(() => null) as any;
      if (!data) {
        return { content: [{ type: "text", text: "Tavily error: invalid JSON response" }] };
      }

      const lines: string[] = [];
      if (data.answer) {
        lines.push(`Answer: ${data.answer}`, "");
      }

      const results = Array.isArray(data.results) ? data.results : [];
      if (results.length === 0) {
        lines.push("No results.");
      } else {
        lines.push("Results:");
        results.forEach((r: any, i: number) => {
          const title = r.title || "(untitled)";
          const url = r.url || "";
          const content = r.content || "";
          lines.push(`${i + 1}. ${title}`);
          if (url) lines.push(`   ${url}`);
          if (content) lines.push(`   ${content}`);
        });
      }

      const { text } = tool_truncateOutput(lines.join("\n").trim(), 2000, 50_000, "head");
      return { content: [{ type: "text", text }] };
    },
  };
}

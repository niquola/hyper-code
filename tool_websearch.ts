import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import { tool_truncateOutput } from "./tool_truncate.ts";

export function tool_websearch(tavilyApiKey?: string): AgentTool {
  return {
    name: "websearch",
    description: "Search or extract the web using Tavily (app.tavily.com). Use search when you have a query. Use extract when you have a specific URL or URLs (provide url or urls to trigger extract). Search params: query, max_results, search_depth, include_domains, exclude_domains, include_answer, include_raw_content. Extract params: url or urls, query (intent), extract_depth, timeout, format. Returns a text summary.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (or extract intent when url/urls provided)" },
        url: { type: "string", description: "Single URL to extract (triggers extract)" },
        urls: { type: "array", items: { type: "string" }, description: "URLs to extract (triggers extract)" },
        max_results: { type: "number", description: "Max results to return (default: 5)" },
        search_depth: { type: "string", enum: ["basic", "advanced"], description: "Search depth (default: basic)" },
        include_domains: { type: "array", items: { type: "string" }, description: "Domains to include" },
        exclude_domains: { type: "array", items: { type: "string" }, description: "Domains to exclude" },
        include_answer: { type: "boolean", description: "Include Tavily answer summary (default: true)" },
        include_raw_content: { type: "boolean", description: "Include raw content (default: false)" },
        extract_depth: { type: "string", enum: ["basic", "advanced"], description: "Extraction depth (default: basic)" },
        timeout: { type: "number", description: "Max seconds to wait for extraction" },
        format: { type: "string", description: "Extracted content format (e.g. markdown, text)" },
      },
    },
    execute: async (ctx: Ctx, session: Session, params: {
      query?: string;
      url?: string;
      urls?: string[];
      max_results?: number;
      search_depth?: "basic" | "advanced";
      include_domains?: string[];
      exclude_domains?: string[];
      include_answer?: boolean;
      include_raw_content?: boolean;
      extract_depth?: "basic" | "advanced";
      timeout?: number;
      format?: string;
    }, signal) => {
      const apiKey = tavilyApiKey;
      if (!apiKey) {
        return { content: [{ type: "text", text: "Missing TAVILY_API_KEY environment variable." }] };
      }

      const hasUrls = Array.isArray(params.urls) && params.urls.length > 0;
      const hasUrl = typeof params.url === "string" && params.url.length > 0;
      const isExtract = hasUrls || hasUrl;

      if (!isExtract && !params.query) {
        return { content: [{ type: "text", text: "Provide either query (search) or url/urls (extract)." }] };
      }

      const endpoint = isExtract ? "https://api.tavily.com/extract" : "https://api.tavily.com/search";
      const body = isExtract
        ? {
          api_key: apiKey,
          urls: hasUrls ? params.urls : [params.url],
          extract_depth: params.extract_depth ?? "basic",
          timeout: params.timeout,
          query: params.query,
          format: params.format,
        }
        : {
          api_key: apiKey,
          query: params.query,
          max_results: params.max_results ?? 5,
          search_depth: params.search_depth ?? "basic",
          include_domains: params.include_domains,
          exclude_domains: params.exclude_domains,
          include_answer: params.include_answer ?? true,
          include_raw_content: params.include_raw_content ?? false,
        };

      const res = await fetch(endpoint, {
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

      if (isExtract) {
        const results = Array.isArray(data.results) ? data.results : [];
        if (results.length === 0) {
          lines.push("No results.");
        } else {
          lines.push("Extracted:");
          results.forEach((r: any, i: number) => {
            const url = r.url || r.source || "(no url)";
            const content = r.content || r.raw_content || "";
            lines.push(`${i + 1}. ${url}`);
            if (content) lines.push(`   ${content}`);
          });
        }

        const failed = Array.isArray(data.failed_urls) ? data.failed_urls : [];
        if (failed.length > 0) {
          lines.push("", "Failed URLs:");
          failed.forEach((u: string) => lines.push(`- ${u}`));
        }
      } else {
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
      }

      const { text } = tool_truncateOutput(lines.join("\n").trim(), 2000, 50_000, "head");
      return { content: [{ type: "text", text }] };
    },
  };
}

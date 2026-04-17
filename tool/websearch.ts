
export const name = "websearch";
export const description = "Search or extract the web using Tavily. Use search for queries. Use extract for specific URLs (provide url or urls).";
export const parameters = {
  type: "object",
  properties: {
    query: { type: "string", description: "Search query (or extract intent when url/urls provided)" },
    url: { type: "string", description: "Single URL to extract" },
    urls: { type: "array", items: { type: "string" }, description: "URLs to extract" },
    max_results: { type: "number", description: "Max results (default: 5)" },
    search_depth: { type: "string", enum: ["basic", "advanced"], description: "Search depth" },
    include_domains: { type: "array", items: { type: "string" } },
    exclude_domains: { type: "array", items: { type: "string" } },
    include_answer: { type: "boolean" },
    include_raw_content: { type: "boolean" },
    extract_depth: { type: "string", enum: ["basic", "advanced"] },
    timeout: { type: "number" },
    format: { type: "string" },
  },
};

export default async function websearch(ctx: Ctx, session: any, params: any, signal?: AbortSignal) {
  const apiKey = ctx.env?.TAVILY_API_KEY;
  if (!apiKey) return { content: [{ type: "text" as const, text: "Missing TAVILY_API_KEY." }] };

  const hasUrls = Array.isArray(params.urls) && params.urls.length > 0;
  const hasUrl = typeof params.url === "string" && params.url.length > 0;
  const isExtract = hasUrls || hasUrl;

  if (!isExtract && !params.query) return { content: [{ type: "text" as const, text: "Provide query or url/urls." }] };

  const endpoint = isExtract ? "https://api.tavily.com/extract" : "https://api.tavily.com/search";
  const body = isExtract
    ? { api_key: apiKey, urls: hasUrls ? params.urls : [params.url], extract_depth: params.extract_depth ?? "basic", timeout: params.timeout, query: params.query, format: params.format }
    : { api_key: apiKey, query: params.query, max_results: params.max_results ?? 5, search_depth: params.search_depth ?? "basic", include_domains: params.include_domains, exclude_domains: params.exclude_domains, include_answer: params.include_answer ?? true, include_raw_content: params.include_raw_content ?? false };

  const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  if (!res.ok) { const err = await res.text().catch(() => ""); return { content: [{ type: "text" as const, text: `Tavily error: ${res.status} ${res.statusText}${err ? `\n${err}` : ""}` }] }; }

  const data = await res.json().catch(() => null) as any;
  if (!data) return { content: [{ type: "text" as const, text: "Tavily: invalid JSON" }] };

  const lines: string[] = [];
  if (isExtract) {
    const results = data.results || [];
    if (!results.length) { lines.push("No results."); } else {
      lines.push("Extracted:");
      results.forEach((r: any, i: number) => { lines.push(`${i + 1}. ${r.url || "(no url)"}`); if (r.content) lines.push(`   ${r.content}`); });
    }
    (data.failed_urls || []).forEach((u: string) => lines.push(`Failed: ${u}`));
  } else {
    if (data.answer) lines.push(`Answer: ${data.answer}`, "");
    const results = data.results || [];
    if (!results.length) { lines.push("No results."); } else {
      lines.push("Results:");
      results.forEach((r: any, i: number) => { lines.push(`${i + 1}. ${r.title || "(untitled)"}`); if (r.url) lines.push(`   ${r.url}`); if (r.content) lines.push(`   ${r.content}`); });
    }
  }

  const { text } = ctx.tool.truncate(lines.join("\n").trim(), 2000, 50_000, "head");
  return { content: [{ type: "text" as const, text }] };
}

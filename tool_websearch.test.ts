import { test, expect, describe, afterEach } from "bun:test";
import { tool_websearch } from "./tool_websearch.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.TAVILY_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.TAVILY_API_KEY;
  else process.env.TAVILY_API_KEY = originalKey;
});

describe("tool_websearch", () => {
  test("returns error when TAVILY_API_KEY is missing", async () => {
    delete process.env.TAVILY_API_KEY;
    const tool = tool_websearch();
    const result = await tool.execute({} as any, {} as any, { query: "bun runtime" });
    const text = result.content.find((c) => c.type === "text")?.text || "";
    expect(text).toContain("TAVILY_API_KEY");
  });

  test("posts to Tavily search and formats results", async () => {
    process.env.TAVILY_API_KEY = "test-key";
    let captured: { url?: string; init?: RequestInit } = {};

    const mockFetch = async (url: any, init?: RequestInit) => {
      captured = { url: String(url), init };
      return new Response(JSON.stringify({
        answer: "Answer text",
        results: [
          { title: "Result One", url: "https://example.com/1", content: "Snippet one" },
          { title: "Result Two", url: "https://example.com/2", content: "Snippet two" },
        ],
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    globalThis.fetch = mockFetch as typeof globalThis.fetch;

    const tool = tool_websearch();
    const result = await tool.execute({} as any, {} as any, { query: "tavily" });
    const text = result.content.find((c) => c.type === "text")?.text || "";

    expect(captured.url).toBe("https://api.tavily.com/search");
    expect(captured.init?.method).toBe("POST");
    const body = JSON.parse(captured.init?.body as string);
    expect(body.query).toBe("tavily");
    expect(body.api_key).toBe("test-key");

    expect(text).toContain("Answer: Answer text");
    expect(text).toContain("1. Result One");
    expect(text).toContain("https://example.com/1");
    expect(text).toContain("Snippet one");
  });

  test("has correct metadata", () => {
    const tool = tool_websearch();
    expect(tool.name).toBe("websearch");
    expect(tool.description).toContain("Tavily");
  });
});

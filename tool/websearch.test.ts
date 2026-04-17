import { test, expect } from "bun:test";
import websearch, { name, parameters } from "./websearch.ts";

test("metadata", () => {
  expect(name).toBe("websearch");
  expect(parameters.properties).toHaveProperty("query");
});

test("returns error without api key", async () => {
  const ctx = { env: {} } as any;
  const r = await websearch(ctx, {}, { query: "test" });
  expect(r.content[0].text).toContain("TAVILY_API_KEY");
});

test("requires query or url", async () => {
  const ctx = { env: { TAVILY_API_KEY: "fake" } } as any;
  const r = await websearch(ctx, {}, {});
  expect(r.content[0].text).toContain("query or url");
});

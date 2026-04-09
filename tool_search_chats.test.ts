import { test, expect } from "bun:test";
import { tool_search_chats } from "./tool_search_chats.ts";

const t = tool_search_chats();

test("has correct metadata", () => {
  expect(t.name).toBe("search_chats");
  expect(t.parameters.required).toContain("query");
});

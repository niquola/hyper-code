import { test, expect } from "bun:test";
import html_message, { name } from "./html_message.ts";

test("metadata", () => { expect(name).toBe("html_message"); });

test("returns html content", async () => {
  const r = await html_message({} as any, {}, { html: "<h1>Hi</h1>" });
  expect(r.content[0]).toEqual({ type: "html", html: "<h1>Hi</h1>" });
});

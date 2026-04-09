import { test, expect } from "bun:test";
import { tool_render_html } from "./tool_render_html.ts";

const t = tool_render_html();

test("returns html content type", async () => {
  const result = await t.execute({ html: "<h1>Hello</h1>" });
  expect(result.content).toHaveLength(1);
  expect(result.content[0]!.type).toBe("html");
  expect((result.content[0] as any).html).toBe("<h1>Hello</h1>");
});

test("has correct metadata", () => {
  expect(t.name).toBe("render_html");
  expect(t.description).toContain("HTML");
});

import { test, expect } from "bun:test";
import { tool_html_message } from "./tool_html_message.ts";

const t = tool_html_message();

test("returns html content type", async () => {
  const result = await t.execute({} as any, {} as any, { html: "<h1>Hello</h1>" });
  expect(result.content).toHaveLength(1);
  expect(result.content[0]!.type).toBe("html");
  expect((result.content[0] as any).html).toBe("<h1>Hello</h1>");
});

test("has correct metadata", () => {
  expect(t.name).toBe("html_message");
  expect(t.description).toContain("HTML");
});

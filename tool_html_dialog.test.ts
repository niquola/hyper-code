import { test, expect } from "bun:test";
import { tool_html_dialog } from "./tool_html_dialog.ts";

const t = tool_html_dialog();

test("returns dialog HTML with form", async () => {
  const result = await t.execute({ title: "Pick one", html: '<input name="choice" />' });
  const html = (result.content[0] as any).html;
  expect(html).toContain("<dialog");
  expect(html).toContain("Pick one");
  expect(html).toContain('name="choice"');
  expect(html).toContain("submitDialog");
  expect(html).toContain("Submit");
  expect(html).toContain("Cancel");
  expect(html).toContain("data-widget-id");
});

test("custom submit label", async () => {
  const result = await t.execute({ title: "Delete?", html: "", submit_label: "Delete" });
  const html = (result.content[0] as any).html;
  expect(html).toContain("Delete");
});

test("has correct metadata", () => {
  expect(t.name).toBe("html_dialog");
  expect(t.description).toContain("modal");
});

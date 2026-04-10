import { test, expect, describe } from "bun:test";
import { layout_view_page } from "./layout_view_page.tsx";
import { queryExists, queryTexts } from "./test_html.ts";

describe("layout_view_page", () => {
  test("renders full HTML page", () => {
    const html = layout_view_page("Test Page", "<p>body</p>");
    expect(html).toContain("<html>");
    expect(html).toContain("</html>");
    expect(html).toContain("<title>Test Page</title>");
    expect(html).toContain("<p>body</p>");
  });

  test("includes htmx", () => {
    const html = layout_view_page("T", "");
    expect(html).toContain("htmx.org");
  });

  test("includes tailwind", () => {
    const html = layout_view_page("T", "");
    expect(html).toContain("tailwindcss");
  });

  test("includes pageState script", () => {
    const html = layout_view_page("T", "");
    expect(html).toContain("__pageState");
  });

  test("has nav with Hyper Code link", () => {
    const html = layout_view_page("T", "");
    expect(queryExists(html, 'a[href="/"]')).toBe(true);
  });

  test("has new chat button", () => {
    const html = layout_view_page("T", "");
    expect(queryExists(html, '[data-action="new"]')).toBe(true);
  });

  test("shows Fork button when sessionId provided", () => {
    const html = layout_view_page("T", "", "gpt-4o", { sessionId: "s1" });
    expect(queryExists(html, '[data-action="fork"]')).toBe(true);
    expect(html).toContain("/session/s1/fork");
  });

  test("no Fork button without session", () => {
    const html = layout_view_page("T", "");
    expect(queryExists(html, '[data-action="fork"]')).toBe(false);
  });

  test("shows parent link when session has parent", () => {
    const html = layout_view_page("T", "", "gpt-4o", { sessionId: "child1", parentId: "parent1", parentTitle: "My Chat" });
    expect(queryExists(html, '[data-role="parent-link"]')).toBe(true);
    expect(html).toContain("My Chat");
    expect(html).toContain("/session/parent1/");
  });

  test("no parent link for root session", () => {
    const html = layout_view_page("T", "", "gpt-4o", { sessionId: "s1" });
    expect(queryExists(html, '[data-role="parent-link"]')).toBe(false);
  });
});

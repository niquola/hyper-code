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
});

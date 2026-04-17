import { test, expect, describe } from "bun:test";
import { ai_renderMarkdown, ai_highlightCode } from "./renderMarkdown.ts";

describe("ai_renderMarkdown", () => {
  test("returns empty for blank input", async () => {
    expect(await ai_renderMarkdown("")).toBe("");
    expect(await ai_renderMarkdown("   ")).toBe("");
  });

  test("renders paragraphs", async () => {
    const html = await ai_renderMarkdown("Hello world");
    expect(html).toContain("<p>Hello world</p>");
  });

  test("renders headers", async () => {
    const html = await ai_renderMarkdown("# Title\n\nBody");
    expect(html).toContain("<h1>Title</h1>");
  });

  test("renders bold and italic", async () => {
    const html = await ai_renderMarkdown("**bold** and *italic*");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  test("renders inline code", async () => {
    const html = await ai_renderMarkdown("Use `console.log`");
    expect(html).toContain("<code>console.log</code>");
  });

  test("renders code blocks with shiki highlighting", async () => {
    const html = await ai_renderMarkdown("```typescript\nconst x = 1;\n```");
    // Shiki generates <pre> with inline styles
    expect(html).toContain("<pre");
    expect(html).toContain("const");
  });

  test("renders unknown language code blocks with fallback", async () => {
    const html = await ai_renderMarkdown("```unknownlang\nfoo bar\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("foo bar");
  });

  test("renders lists", async () => {
    const html = await ai_renderMarkdown("- item 1\n- item 2");
    expect(html).toContain("<li>");
    expect(html).toContain("item 1");
  });
});

describe("ai_highlightCode", () => {
  test("highlights typescript code", async () => {
    const html = await ai_highlightCode("const x: number = 1;", "typescript");
    expect(html).toContain("<pre");
    expect(html).toContain("const");
  });

  test("highlights javascript code", async () => {
    const html = await ai_highlightCode("function hello() {}", "javascript");
    expect(html).toContain("<pre");
    expect(html).toContain("function");
  });

  test("falls back for unknown language", async () => {
    const html = await ai_highlightCode("some code", "brainfuck");
    expect(html).toContain("<pre");
    expect(html).toContain("some code");
  });

  test("escapes HTML in fallback", async () => {
    const html = await ai_highlightCode("<div>test</div>", "brainfuck");
    expect(html).toContain("&lt;div&gt;");
  });
});

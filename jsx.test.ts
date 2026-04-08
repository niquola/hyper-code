import { test, expect, describe } from "bun:test";
import { jsx, jsxs, Fragment, escapeHtml } from "./jsx.ts";

describe("escapeHtml", () => {
  test("escapes special characters", () => {
    const result = escapeHtml('<script>"alert&1\'</script>');
    expect(result).toContain("&lt;script&gt;");
    expect(result).toContain("&quot;");
    expect(result).toContain("&amp;");
    expect(result).toContain("&lt;/script&gt;");
    // Single quote: &#39; or &#x27; both valid
    expect(result).toMatch(/&#39;|&#x27;/);
  });

  test("leaves normal text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("jsx", () => {
  test("renders simple element", () => {
    expect(jsx("div", { children: "hello" })).toBe("<div>hello</div>");
  });

  test("renders with attributes", () => {
    const html = jsx("a", { href: "/test", className: "link", children: "click" });
    expect(html).toBe('<a href="/test" class="link">click</a>');
  });

  test("renders void elements", () => {
    expect(jsx("br", {})).toBe("<br />");
    expect(jsx("input", { type: "text", name: "q" })).toBe('<input type="text" name="q" />');
  });

  test("renders boolean attributes", () => {
    expect(jsx("input", { required: true })).toBe("<input required />");
    expect(jsx("input", { disabled: false })).toBe("<input />");
  });

  test("renders style objects", () => {
    const html = jsx("div", { style: { color: "red", fontSize: "14px" }, children: "x" });
    expect(html).toContain('style="color: red; font-size: 14px"');
  });

  test("renders dangerouslySetInnerHTML", () => {
    const html = jsx("div", { dangerouslySetInnerHTML: { __html: "<b>raw</b>" } });
    expect(html).toBe("<div><b>raw</b></div>");
  });

  test("skips null/undefined/false children", () => {
    expect(jsx("div", { children: null })).toBe("<div></div>");
    expect(jsx("div", { children: false })).toBe("<div></div>");
    expect(jsx("div", { children: undefined })).toBe("<div></div>");
  });

  test("renders number children", () => {
    expect(jsx("span", { children: 42 })).toBe("<span>42</span>");
  });

  test("renders array children", () => {
    const html = jsxs("ul", { children: [jsx("li", { children: "a" }), jsx("li", { children: "b" })] });
    expect(html).toBe("<ul><li>a</li><li>b</li></ul>");
  });

  test("renders functional components", () => {
    function Greeting({ name }: { name: string; children?: any }) {
      return jsx("span", { children: `Hi ${name}` });
    }
    expect(jsx(Greeting as any, { name: "World" })).toBe("<span>Hi World</span>");
  });
});

describe("Fragment", () => {
  test("renders children without wrapper", () => {
    expect(Fragment({ children: "hello" })).toBe("hello");
    expect(Fragment({ children: ["a", "b", "c"] })).toBe("abc");
  });
});

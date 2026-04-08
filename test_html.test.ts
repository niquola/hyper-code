import { test, expect, describe } from "bun:test";
import { queryAll, queryTexts, queryAttrs, queryCount, queryExists } from "./test_html.ts";

describe("test_html helpers", () => {
  const html = '<div class="a"><span id="x">hello</span><span id="y">world</span></div><p class="b">text</p>';

  test("queryTexts extracts text content", () => {
    expect(queryTexts(html, "span")).toEqual(["hello", "world"]);
  });

  test("queryAttrs extracts attribute values", () => {
    expect(queryAttrs(html, "span", "id")).toEqual(["x", "y"]);
  });

  test("queryCount counts matches", () => {
    expect(queryCount(html, "span")).toBe(2);
    expect(queryCount(html, "p")).toBe(1);
    expect(queryCount(html, "h1")).toBe(0);
  });

  test("queryExists checks presence", () => {
    expect(queryExists(html, "span")).toBe(true);
    expect(queryExists(html, "h1")).toBe(false);
  });

  test("queryAttrs with class", () => {
    expect(queryAttrs(html, "div", "class")).toEqual(["a"]);
  });
});

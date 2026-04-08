import { test, expect, describe } from "bun:test";
import { tool_truncateOutput } from "./tool_truncate.ts";

describe("tool_truncateOutput", () => {
  test("returns short text unchanged", () => {
    const result = tool_truncateOutput("hello", 100, 100);
    expect(result.text).toBe("hello");
    expect(result.truncated).toBe(false);
  });

  test("truncates by line count", () => {
    const lines = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
    const result = tool_truncateOutput(lines, 50, 100000);
    expect(result.text.split("\n").length).toBeLessThanOrEqual(52); // 50 + message
    expect(result.truncated).toBe(true);
    expect(result.text).toContain("Truncated");
  });

  test("truncates by byte count", () => {
    const text = "x".repeat(10000);
    const result = tool_truncateOutput(text, 10000, 500);
    expect(result.text.length).toBeLessThanOrEqual(600); // 500 + message
    expect(result.truncated).toBe(true);
  });

  test("keeps tail for command output", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n");
    const result = tool_truncateOutput(lines, 10, 100000, "tail");
    // Should have the last lines
    expect(result.text).toContain("line 99");
    expect(result.text).not.toContain("line 0\n");
  });

  test("keeps head by default", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n");
    const result = tool_truncateOutput(lines, 10, 100000, "head");
    expect(result.text).toContain("line 0");
    expect(result.text).not.toContain("line 99");
  });
});

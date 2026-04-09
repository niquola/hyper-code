import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { tool_grep } from "./tool_grep.ts";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "grep-test-"));
  writeFileSync(join(tmpDir, "hello.ts"), `export function greet(name: string) {\n  return "Hello " + name;\n}\n`);
  writeFileSync(join(tmpDir, "world.ts"), `export function world() {\n  return "World";\n}\n`);
  writeFileSync(join(tmpDir, "data.json"), `{"greeting": "hello", "name": "world"}\n`);
  mkdirSync(join(tmpDir, "sub"));
  writeFileSync(join(tmpDir, "sub/nested.ts"), `const greeting = "Hello from nested";\n`);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("tool_grep", () => {
  test("has correct metadata", () => {
    const grep = tool_grep(tmpDir);
    expect(grep.name).toBe("grep");
    expect((grep.parameters as any).required).toContain("pattern");
  });

  test("finds matches across files", async () => {
    const grep = tool_grep(tmpDir);
    const result = await grep.execute({} as any, {} as any, { pattern: "Hello" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("hello.ts");
    expect(text).toContain("Hello");
  });

  test("searches with regex", async () => {
    const grep = tool_grep(tmpDir);
    const result = await grep.execute({} as any, {} as any, { pattern: "function \\w+" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("greet");
    expect(text).toContain("world");
  });

  test("filters by glob pattern", async () => {
    const grep = tool_grep(tmpDir);
    const result = await grep.execute({} as any, {} as any, { pattern: "hello", glob: "*.json" });
    const text = (result.content[0] as any).text as string;
    // Should only find in data.json, not .ts files
    expect(text).toContain("data.json");
    expect(text).not.toContain("hello.ts");
  });

  test("searches in subdirectories", async () => {
    const grep = tool_grep(tmpDir);
    const result = await grep.execute({} as any, {} as any, { pattern: "nested" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("nested.ts");
  });

  test("searches specific path", async () => {
    const grep = tool_grep(tmpDir);
    const result = await grep.execute({} as any, {} as any, { pattern: "Hello", path: "sub" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("nested");
    expect(text).not.toContain("hello.ts");
  });

  test("returns no matches message", async () => {
    const grep = tool_grep(tmpDir);
    const result = await grep.execute({} as any, {} as any, { pattern: "zzzznonexistent" });
    const text = (result.content[0] as any).text as string;
    expect(text.toLowerCase()).toContain("no matches");
  });

  test("supports case insensitive search", async () => {
    const grep = tool_grep(tmpDir);
    const result = await grep.execute({} as any, {} as any, { pattern: "hello", ignoreCase: true });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("Hello");
  });
});

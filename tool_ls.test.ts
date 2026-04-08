import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { tool_ls } from "./tool_ls.ts";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ls-test-"));
  writeFileSync(join(tmpDir, "file.ts"), "export {}");
  writeFileSync(join(tmpDir, "readme.md"), "# Hello");
  mkdirSync(join(tmpDir, "src"));
  writeFileSync(join(tmpDir, "src/index.ts"), "export {}");
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("tool_ls", () => {
  test("has correct metadata", () => {
    const ls = tool_ls(tmpDir);
    expect(ls.name).toBe("ls");
  });

  test("lists current directory", async () => {
    const ls = tool_ls(tmpDir);
    const result = await ls.execute({});
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("file.ts");
    expect(text).toContain("readme.md");
    expect(text).toContain("src");
  });

  test("shows directory indicator", async () => {
    const ls = tool_ls(tmpDir);
    const result = await ls.execute({});
    const text = (result.content[0] as any).text as string;
    // Directories should be distinguishable
    expect(text).toContain("src/");
  });

  test("lists subdirectory", async () => {
    const ls = tool_ls(tmpDir);
    const result = await ls.execute({ path: "src" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("index.ts");
    expect(text).not.toContain("readme.md");
  });

  test("errors on nonexistent path", async () => {
    const ls = tool_ls(tmpDir);
    const result = await ls.execute({ path: "nonexistent" });
    const text = (result.content[0] as any).text as string;
    expect(text.toLowerCase()).toContain("not found") ;
  });
});

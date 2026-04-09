import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { tool_find } from "./tool_find.ts";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "find-test-"));
  writeFileSync(join(tmpDir, "app.ts"), "export default {}");
  writeFileSync(join(tmpDir, "app.test.ts"), "test('x', ()=>{})");
  writeFileSync(join(tmpDir, "style.css"), "body {}");
  writeFileSync(join(tmpDir, "data.json"), "{}");
  mkdirSync(join(tmpDir, "src"));
  writeFileSync(join(tmpDir, "src/index.ts"), "export {}");
  writeFileSync(join(tmpDir, "src/util.ts"), "export {}");
  mkdirSync(join(tmpDir, "src/components"));
  writeFileSync(join(tmpDir, "src/components/Button.tsx"), "export {}");
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("tool_find", () => {
  test("has correct metadata", () => {
    const find = tool_find(tmpDir);
    expect(find.name).toBe("find");
    expect((find.parameters as any).required).toContain("pattern");
  });

  test("finds files by glob", async () => {
    const find = tool_find(tmpDir);
    const result = await find.execute({} as any, {} as any, { pattern: "*.ts" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("app.ts");
    expect(text).toContain("app.test.ts");
    expect(text).not.toContain("style.css");
  });

  test("finds files recursively", async () => {
    const find = tool_find(tmpDir);
    const result = await find.execute({} as any, {} as any, { pattern: "**/*.ts" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("src/index.ts");
    expect(text).toContain("src/util.ts");
  });

  test("finds tsx files", async () => {
    const find = tool_find(tmpDir);
    const result = await find.execute({} as any, {} as any, { pattern: "**/*.tsx" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("Button.tsx");
  });

  test("searches in specific path", async () => {
    const find = tool_find(tmpDir);
    const result = await find.execute({} as any, {} as any, { pattern: "*.ts", path: "src" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("index.ts");
    expect(text).not.toContain("app.ts");
  });

  test("returns no matches message", async () => {
    const find = tool_find(tmpDir);
    const result = await find.execute({} as any, {} as any, { pattern: "*.xyz" });
    const text = (result.content[0] as any).text as string;
    expect(text.toLowerCase()).toContain("no files");
  });
});

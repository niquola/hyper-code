import { test, expect, describe } from "bun:test";
import read, { name, description, parameters } from "./read.ts";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const TEST_DIR = "/tmp/tool-read-test";
const ctx = { cwd: TEST_DIR, home: "/tmp", env: {} } as any;

describe("tool/read", () => {
  test("exports metadata", () => {
    expect(name).toBe("read");
    expect(description).toContain("Read a file");
    expect(parameters.required).toContain("path");
  });

  test("reads file with line numbers", async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(`${TEST_DIR}/hello.txt`, "line1\nline2\nline3");

    const result = await read(ctx, {} as any, { path: "hello.txt" });
    const text = result.content[0]!.text;
    expect(text).toContain("1\tline1");
    expect(text).toContain("2\tline2");
    expect(text).toContain("3\tline3");

    rmSync(TEST_DIR, { recursive: true });
  });

  test("supports offset and limit", async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(`${TEST_DIR}/big.txt`, "a\nb\nc\nd\ne");

    const result = await read(ctx, {} as any, { path: "big.txt", offset: 2, limit: 2 });
    const text = result.content[0]!.text;
    expect(text).toContain("2\tb");
    expect(text).toContain("3\tc");
    expect(text).not.toContain("1\ta");
    expect(text).not.toContain("4\td");

    rmSync(TEST_DIR, { recursive: true });
  });

  test("resolves ~ paths", async () => {
    // Just check it doesn't crash — home is /tmp in test ctx
    try {
      await read(ctx, {} as any, { path: "~/nonexistent-file-xyz" });
    } catch (e: any) {
      expect(e.message).toContain("File not found");
    }
  });

  test("throws for missing file", async () => {
    try {
      await read(ctx, {} as any, { path: "does-not-exist.ts" });
      expect(true).toBe(false); // should not reach
    } catch (e: any) {
      expect(e.message).toContain("File not found");
    }
  });
});

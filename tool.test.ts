import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { tool_read } from "./tool_read.ts";
import { tool_write } from "./tool_write.ts";
import { tool_edit } from "./tool_edit.ts";
import { tool_bash } from "./tool_bash.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeFileSync, mkdirSync } from "node:fs";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "hyper-test-"));
  writeFileSync(join(tmpDir, "hello.ts"), `export function greet(name: string) {\n  return "Hello " + name;\n}\n`);
  writeFileSync(join(tmpDir, "data.json"), `{"key": "value", "num": 42}\n`);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// -- tool_read --

describe("tool_read", () => {
  test("reads a file with line numbers", async () => {
    const read = tool_read(tmpDir);
    const result = await read.execute({} as any, {} as any, { path: "hello.ts" });
    expect(result.content[0]!.type).toBe("text");
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("1\texport function greet");
    expect(text).toContain("2\t  return");
  });

  test("reads with offset", async () => {
    const read = tool_read(tmpDir);
    const result = await read.execute({} as any, {} as any, { path: "hello.ts", offset: 2 });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("2\t  return");
    expect(text).not.toContain("1\texport");
  });

  test("reads with limit", async () => {
    const read = tool_read(tmpDir);
    const result = await read.execute({} as any, {} as any, { path: "hello.ts", limit: 1 });
    const text = (result.content[0] as any).text as string;
    const lines = text.trim().split("\n");
    expect(lines).toHaveLength(1);
  });

  test("errors on missing file", async () => {
    const read = tool_read(tmpDir);
    expect(read.execute({} as any, {} as any, { path: "nonexistent.ts" })).rejects.toThrow();
  });

  test("reads absolute path", async () => {
    const read = tool_read(tmpDir);
    const result = await read.execute({} as any, {} as any, { path: join(tmpDir, "data.json") });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain('"key"');
  });

  test("has correct tool metadata", () => {
    const read = tool_read(tmpDir);
    expect(read.name).toBe("read");
    expect(read.description).toContain("Read");
    expect((read.parameters as any).required).toContain("path");
  });
});

// -- tool_write --

describe("tool_write", () => {
  test("creates a new file", async () => {
    const write = tool_write(tmpDir);
    const result = await write.execute({} as any, {} as any, { path: "new.txt", content: "hello world" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("11 bytes");
    // Verify file exists
    const read = tool_read(tmpDir);
    const readResult = await read.execute({} as any, {} as any, { path: "new.txt" });
    expect((readResult.content[0] as any).text).toContain("hello world");
  });

  test("creates nested directories", async () => {
    const write = tool_write(tmpDir);
    await write.execute({} as any, {} as any, { path: "sub/dir/deep.txt", content: "nested" });
    const read = tool_read(tmpDir);
    const result = await read.execute({} as any, {} as any, { path: "sub/dir/deep.txt" });
    expect((result.content[0] as any).text).toContain("nested");
  });

  test("overwrites existing file", async () => {
    const write = tool_write(tmpDir);
    await write.execute({} as any, {} as any, { path: "overwrite.txt", content: "first" });
    await write.execute({} as any, {} as any, { path: "overwrite.txt", content: "second" });
    const read = tool_read(tmpDir);
    const result = await read.execute({} as any, {} as any, { path: "overwrite.txt" });
    const text = (result.content[0] as any).text as string;
    expect(text).toContain("second");
    expect(text).not.toContain("first");
  });

  test("has correct tool metadata", () => {
    const write = tool_write(tmpDir);
    expect(write.name).toBe("write");
    expect((write.parameters as any).required).toContain("path");
    expect((write.parameters as any).required).toContain("content");
  });
});

// -- tool_edit --

describe("tool_edit", () => {
  test("replaces text in file", async () => {
    const write = tool_write(tmpDir);
    await write.execute({} as any, {} as any, { path: "edit-me.ts", content: 'const x = 1;\nconst y = 2;\n' });

    const edit = tool_edit(tmpDir);
    const result = await edit.execute({} as any, {} as any, {
      path: "edit-me.ts",
      edits: [{ oldText: "const x = 1;", newText: "const x = 42;" }],
    });
    expect((result.content[0] as any).text).toContain("Applied 1 edit");

    const read = tool_read(tmpDir);
    const readResult = await read.execute({} as any, {} as any, { path: "edit-me.ts" });
    expect((readResult.content[0] as any).text).toContain("const x = 42;");
  });

  test("applies multiple edits", async () => {
    const write = tool_write(tmpDir);
    await write.execute({} as any, {} as any, { path: "multi-edit.ts", content: 'let a = 1;\nlet b = 2;\n' });

    const edit = tool_edit(tmpDir);
    const result = await edit.execute({} as any, {} as any, {
      path: "multi-edit.ts",
      edits: [
        { oldText: "let a = 1;", newText: "const a = 10;" },
        { oldText: "let b = 2;", newText: "const b = 20;" },
      ],
    });
    expect((result.content[0] as any).text).toContain("Applied 2 edit");
  });

  test("errors on missing text", async () => {
    const write = tool_write(tmpDir);
    await write.execute({} as any, {} as any, { path: "no-match.ts", content: "hello" });

    const edit = tool_edit(tmpDir);
    const result = await edit.execute({} as any, {} as any, {
      path: "no-match.ts",
      edits: [{ oldText: "world", newText: "earth" }],
    });
    expect((result.content[0] as any).text).toContain("not found");
  });

  test("errors on duplicate match", async () => {
    const write = tool_write(tmpDir);
    await write.execute({} as any, {} as any, { path: "dup.ts", content: "x = 1;\nx = 1;\n" });

    const edit = tool_edit(tmpDir);
    const result = await edit.execute({} as any, {} as any, {
      path: "dup.ts",
      edits: [{ oldText: "x = 1;", newText: "x = 2;" }],
    });
    expect((result.content[0] as any).text).toContain("2 times");
  });
});

// -- tool_bash --

describe("tool_bash", () => {
  test("runs a command and returns output", async () => {
    const bash = tool_bash(tmpDir);
    const result = await bash.execute({} as any, {} as any, { command: "echo hello" });
    const text = (result.content[0] as any).text as string;
    expect(text.trim()).toContain("hello");
  });

  test("captures stderr", async () => {
    const bash = tool_bash(tmpDir);
    const result = await bash.execute({} as any, {} as any, { command: "echo error >&2" });
    expect((result.content[0] as any).text).toContain("error");
  });

  test("reports non-zero exit code", async () => {
    const bash = tool_bash(tmpDir);
    const result = await bash.execute({} as any, {} as any, { command: "exit 1" });
    expect((result.content[0] as any).text).toContain("Exit code: 1");
  });

  test("runs in correct cwd", async () => {
    const bash = tool_bash(tmpDir);
    const result = await bash.execute({} as any, {} as any, { command: "ls hello.ts" });
    expect((result.content[0] as any).text).toContain("hello.ts");
  });

  test("respects timeout", async () => {
    const bash = tool_bash(tmpDir);
    const result = await bash.execute({} as any, {} as any, { command: "sleep 10", timeout: 1 });
    // Should complete (killed) within ~1s, not 10s
    const text = (result.content[0] as any).text as string;
    expect(text).toBeTruthy();
  }, 5000);

  test("has correct tool metadata", () => {
    const bash = tool_bash(tmpDir);
    expect(bash.name).toBe("bash");
    expect((bash.parameters as any).required).toContain("command");
  });
});

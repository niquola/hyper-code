import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { loader_loadFile, loader_loadAll, loader_genTypes, loader_genTestCtx } from "./loader.ts";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const TEST_DIR = "/tmp/loader-test-project";

function setup() {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(`${TEST_DIR}/tool`, { recursive: true });
  mkdirSync(`${TEST_DIR}/chat`, { recursive: true });

  // tool/read.ts
  writeFileSync(`${TEST_DIR}/tool/read.ts`, `
export default function read(ctx: any, params: { path: string }) {
  return { content: [{ type: "text", text: "file contents" }] };
}
`);

  // tool/write.ts
  writeFileSync(`${TEST_DIR}/tool/write.ts`, `
export default function write(ctx: any, params: { path: string; content: string }) {
  return { content: [{ type: "text", text: "written" }] };
}
`);

  // chat/db.ts
  writeFileSync(`${TEST_DIR}/chat/db.ts`, `
export default function db(path?: string) {
  return { getSession: (id: string) => null };
}
`);

  // chat/session_type.ts — type-only, should NOT be loaded
  writeFileSync(`${TEST_DIR}/chat/session_type.ts`, `
export type Session = { id: string };
export default {};
`);

  // root-level file — should be skipped
  writeFileSync(`${TEST_DIR}/server.ts`, `
export default function server() { return "skip me"; }
`);
}

describe("loader", () => {
  beforeAll(setup);
  afterAll(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  test("loadFile registers function on ctx", async () => {
    const ctx: any = {};
    const result = await loader_loadFile(ctx, TEST_DIR, "tool/read.ts");

    expect(result).not.toBeNull();
    expect(result!.ns).toBe("tool");
    expect(result!.name).toBe("read");
    expect(typeof ctx.tool.read).toBe("function");
  });

  test("loadFile skips _type files", async () => {
    const ctx: any = {};
    const result = await loader_loadFile(ctx, TEST_DIR, "chat/session_type.ts");
    expect(result).toBeNull();
  });

  test("loadFile skips root-level files", async () => {
    const ctx: any = {};
    const result = await loader_loadFile(ctx, TEST_DIR, "server.ts");
    expect(result).toBeNull();
  });

  test("loadAll loads all namespace files", async () => {
    const ctx: any = {};
    const loaded = await loader_loadAll(ctx, TEST_DIR);

    expect(loaded).toContain("tool.read");
    expect(loaded).toContain("tool.write");
    expect(loaded).toContain("chat.db");
    // _type should not be loaded
    expect(loaded).not.toContain("chat.session_type");
    // Root file should not be loaded
    expect(loaded.some(l => l.includes("server"))).toBe(false);

    expect(typeof ctx.tool.read).toBe("function");
    expect(typeof ctx.tool.write).toBe("function");
    expect(typeof ctx.chat.db).toBe("function");
  });

  test("genTypes generates ctx_ns.d.ts", async () => {
    const content = await loader_genTypes(TEST_DIR);

    expect(content).toContain("export default interface CtxNs");
    expect(content).toContain("tool: {");
    expect(content).toContain("read: typeof import");
    expect(content).toContain("write: typeof import");
    expect(content).toContain("chat: {");
    expect(content).toContain("db: typeof import");
    // _type should not appear
    expect(content).not.toContain("session_type");
  });

  test("genTestCtx generates test_ctx_gen.ts", async () => {
    const content = await loader_genTestCtx(TEST_DIR);

    expect(content).toContain("export default function test_ctx");
    expect(content).toContain('import _tool_read from "./tool/read"');
    expect(content).toContain('import _chat_db from "./chat/db"');
    expect(content).toContain("tool: {");
    expect(content).toContain("read: _tool_read,");
    // _type should not be imported
    expect(content).not.toContain("session_type");
  });

  test("loaded functions are callable", async () => {
    const ctx: any = {};
    await loader_loadAll(ctx, TEST_DIR);

    const result = ctx.tool.read(ctx, { path: "test.ts" });
    expect(result.content[0].text).toBe("file contents");
  });
});

import { test, expect, describe } from "bun:test";
import { tool_ts } from "./tool_ts.ts";

const t = tool_ts(".");

describe("tool_ts", () => {
  test("has correct metadata", () => {
    expect(t.name).toBe("ts");
    expect(t.parameters.required).toContain("action");
  });

  test("symbols lists exports from file", async () => {
    const result = await t.execute({} as any, {} as any, { action: "symbols", path: "chat_db.ts" });
    const text = (result.content[0] as any).text;
    expect(text).toContain("chat_db");
    expect(text).toContain("getDb");
  });

  test("type returns type info", async () => {
    const result = await t.execute({} as any, {} as any, { action: "type", path: "chat_db.ts", name: "SessionRow" });
    const text = (result.content[0] as any).text;
    expect(text).toContain("session_id");
  });

  test("references finds usages", async () => {
    const result = await t.execute({} as any, {} as any, { action: "references", path: "chat_db.ts", name: "getDb" });
    const text = (result.content[0] as any).text;
    expect(text).toContain("references");
    expect(text).toContain("server.ts");
  });

  test("diagnostics reports errors", async () => {
    const result = await t.execute({} as any, {} as any, { action: "diagnostics", path: "chat_db.ts" });
    const text = (result.content[0] as any).text;
    expect(text).toBeTruthy();
  });

  test("imports lists file imports", async () => {
    const result = await t.execute({} as any, {} as any, { action: "imports", path: "server.ts" });
    const text = (result.content[0] as any).text;
    expect(text).toContain("import");
  });

  test("rename renames symbol across files", async () => {
    // Dry run — just check it returns edits without applying
    const result = await t.execute({} as any, {} as any, { action: "rename", path: "chat_db.ts", name: "SearchResult", new_name: "SearchHit", dry_run: true });
    const text = (result.content[0] as any).text;
    expect(text).toContain("SearchResult");
  });
});

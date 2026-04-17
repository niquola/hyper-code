import { test, expect, describe } from "bun:test";
import ts, { name, parameters } from "./ts.ts";

const ctx = { cwd: ".", home: "/tmp", env: {} } as any;

describe("tool/ts", () => {
  test("metadata", () => {
    expect(name).toBe("ts");
    expect(parameters.required).toContain("action");
  });

  test("symbols lists exports", async () => {
    const r = await ts(ctx, {}, { action: "symbols", path: "chat/db.ts" });
    expect(r.content[0].text).toContain("chat_db");
  });

  test("type returns type info", async () => {
    const r = await ts(ctx, {}, { action: "type", path: "chat/db.ts", name: "SessionRow" });
    expect(r.content[0].text).toContain("session_id");
  });

  test("diagnostics reports", async () => {
    const r = await ts(ctx, {}, { action: "diagnostics", path: "chat/db.ts" });
    expect(r.content[0].text).toBeTruthy();
  });

  test("imports lists file imports", async () => {
    const r = await ts(ctx, {}, { action: "imports", path: "server.ts" });
    expect(r.content[0].text).toContain("import");
  });
});

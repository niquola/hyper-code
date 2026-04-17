import { test, expect } from "bun:test";
import ls, { name } from "./ls.ts";

const ctx = { cwd: ".", home: "/tmp", env: {} } as any;

test("metadata", () => { expect(name).toBe("ls"); });

test("lists current directory", async () => {
  const r = await ls(ctx, {}, {});
  expect(r.content[0].text).toContain("server.ts");
  expect(r.content[0].text).toContain("tool/");
});

test("lists subdirectory", async () => {
  const r = await ls(ctx, {}, { path: "tool" });
  expect(r.content[0].text).toContain("read.ts");
});

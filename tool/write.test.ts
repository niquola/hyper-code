import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";
import { mkdirSync, rmSync, readFileSync } from "node:fs";

const DIR = "/tmp/tool-write-test";

test("writes file", async () => {
  mkdirSync(DIR, { recursive: true });
  const ctx = test_ctx({ cwd: DIR });
  const r = await ctx.tool.write(ctx, {}, { path: "out.txt", content: "hello world" });
  expect(r.content[0].text).toContain("Wrote");
  expect(readFileSync(`${DIR}/out.txt`, "utf-8")).toBe("hello world");
  rmSync(DIR, { recursive: true });
});

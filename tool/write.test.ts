import { test, expect } from "bun:test";
import write, { name, parameters } from "./write.ts";
import { mkdirSync, rmSync, readFileSync } from "node:fs";

const DIR = "/tmp/tool-write-test";
const ctx = { cwd: DIR, home: "/tmp", env: {} } as any;

test("metadata", () => {
  expect(name).toBe("write");
  expect(parameters.required).toContain("path");
});

test("writes file", async () => {
  mkdirSync(DIR, { recursive: true });
  const r = await write(ctx, {}, { path: "out.txt", content: "hello world" });
  expect(r.content[0].text).toContain("Wrote");
  expect(readFileSync(`${DIR}/out.txt`, "utf-8")).toBe("hello world");
  rmSync(DIR, { recursive: true });
});

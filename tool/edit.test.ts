import { test, expect } from "bun:test";
import edit, { name, parameters } from "./edit.ts";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";

const DIR = "/tmp/tool-edit-test";
const ctx = { cwd: DIR, home: "/tmp", env: {} } as any;

test("metadata", () => {
  expect(name).toBe("edit");
  expect(parameters.required).toContain("edits");
});

test("replaces text in file", async () => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/f.ts`, "const x = 1;\nconst y = 2;");
  const r = await edit(ctx, {}, { path: "f.ts", edits: [{ oldText: "const x = 1;", newText: "const x = 42;" }] });
  expect(r.content[0].text).toContain("Applied 1 edit");
  expect(readFileSync(`${DIR}/f.ts`, "utf-8")).toContain("const x = 42;");
  rmSync(DIR, { recursive: true });
});

test("errors on non-unique match", async () => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/dup.ts`, "aaa\naaa");
  const r = await edit(ctx, {}, { path: "dup.ts", edits: [{ oldText: "aaa", newText: "bbb" }] });
  expect(r.content[0].text).toContain("found 2 times");
  rmSync(DIR, { recursive: true });
});

import { test, expect, afterAll } from "bun:test";
import { tool_edit } from "./tool_edit.ts";
import { rmSync, mkdirSync } from "node:fs";

const DIR = "/tmp/hyper-test-edit";
mkdirSync(DIR, { recursive: true });
afterAll(() => rmSync(DIR, { recursive: true, force: true }));

const t = tool_edit(DIR);

test("edits file with unique match", async () => {
  await Bun.write(`${DIR}/test.txt`, "hello world\nfoo bar\n");
  const result = await t.execute({ path: "test.txt", edits: [{ oldText: "foo bar", newText: "baz qux" }] });
  const text = result.content.find((c) => c.type === "text")?.text || "";
  expect(text.toLowerCase()).toContain("edit");
  const content = await Bun.file(`${DIR}/test.txt`).text();
  expect(content).toContain("baz qux");
  expect(content).not.toContain("foo bar");
});

test("fails on non-unique match", async () => {
  await Bun.write(`${DIR}/dup.txt`, "aaa\naaa\n");
  const result = await t.execute({ path: "dup.txt", edits: [{ oldText: "aaa", newText: "bbb" }] });
  const text = result.content.find((c) => c.type === "text")?.text || "";
  expect(text.toLowerCase()).toMatch(/multiple|unique|found|2 match/i);
});

test("has correct metadata", () => {
  expect(t.name).toBe("edit");
});

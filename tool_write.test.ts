import { test, expect, afterAll } from "bun:test";
import { tool_write } from "./tool_write.ts";
import { rmSync, mkdirSync } from "node:fs";

const DIR = "/tmp/hyper-test-write";
mkdirSync(DIR, { recursive: true });
afterAll(() => rmSync(DIR, { recursive: true, force: true }));

const t = tool_write(DIR);

test("writes new file", async () => {
  const result = await t.execute({} as any, {} as any, { path: "new.txt", content: "hello" });
  const text = result.content.find((c) => c.type === "text")?.text || "";
  expect(text.toLowerCase()).toContain("wrote");
  expect(await Bun.file(`${DIR}/new.txt`).text()).toBe("hello");
});

test("creates subdirectories", async () => {
  await t.execute({} as any, {} as any, { path: "sub/dir/file.txt", content: "deep" });
  expect(await Bun.file(`${DIR}/sub/dir/file.txt`).text()).toBe("deep");
});

test("has correct metadata", () => {
  expect(t.name).toBe("write");
});

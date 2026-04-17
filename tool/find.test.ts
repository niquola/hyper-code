import { test, expect } from "bun:test";
import find, { name, parameters } from "./find.ts";

const ctx = { cwd: ".", home: "/tmp", env: {} } as any;

test("metadata", () => {
  expect(name).toBe("find");
  expect(parameters.required).toContain("pattern");
});

test("finds ts files", async () => {
  const r = await find(ctx, {}, { pattern: "*.ts", path: "tool" });
  expect(r.content[0].text).toContain("read.ts");
  expect(r.content[0].text).toContain("bash.ts");
});

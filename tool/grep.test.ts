import { test, expect } from "bun:test";
import grep, { name, parameters } from "./grep.ts";

const ctx = { cwd: ".", home: "/tmp", env: {} } as any;

test("metadata", () => {
  expect(name).toBe("grep");
  expect(parameters.required).toContain("pattern");
});

test("finds pattern in files", async () => {
  const r = await grep(ctx, {}, { pattern: "export default", path: "tool", glob: "*.ts" });
  expect(r.content[0].text).toContain("read.ts");
});

test("no matches returns message", async () => {
  const r = await grep(ctx, {}, { pattern: "xq9z8w7v6u5t4s3", path: "ai_models" });
  expect(r.content[0].text.toLowerCase()).toContain("no match");
});

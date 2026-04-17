import { test, expect } from "bun:test";
import { cdp_nextId } from "./nextId.ts";

test("cdp_nextId increments per state object", () => {
  const state = { nextId: 1 };
  expect(cdp_nextId(state)).toBe(1);
  expect(cdp_nextId(state)).toBe(2);
  expect(cdp_nextId(state)).toBe(3);
});

test("cdp_nextId is isolated across different states", () => {
  const a = { nextId: 1 };
  const b = { nextId: 10 };
  expect(cdp_nextId(a)).toBe(1);
  expect(cdp_nextId(b)).toBe(10);
  expect(cdp_nextId(a)).toBe(2);
  expect(cdp_nextId(b)).toBe(11);
});

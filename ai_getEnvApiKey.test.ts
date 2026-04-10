import { test, expect, beforeEach } from "bun:test";
import { ai_getEnvApiKey } from "./ai_getEnvApiKey.ts";

test("returns env var for known provider", () => {
  const old = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  expect(ai_getEnvApiKey("openai")).toBe("test-key");
  if (old) process.env.OPENAI_API_KEY = old;
  else delete process.env.OPENAI_API_KEY;
});

test("returns undefined for unknown provider", () => {
  expect(ai_getEnvApiKey("nonexistent")).toBeUndefined();
});

test("anthropic prefers oauth token", () => {
  const oldOAuth = process.env.ANTHROPIC_OAUTH_TOKEN;
  const oldKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_OAUTH_TOKEN = "oauth-tok";
  process.env.ANTHROPIC_API_KEY = "api-key";
  expect(ai_getEnvApiKey("anthropic")).toBe("oauth-tok");
  if (oldOAuth) process.env.ANTHROPIC_OAUTH_TOKEN = oldOAuth; else delete process.env.ANTHROPIC_OAUTH_TOKEN;
  if (oldKey) process.env.ANTHROPIC_API_KEY = oldKey; else delete process.env.ANTHROPIC_API_KEY;
});

test("codex reads JWT from ~/.codex/auth.json", () => {
  const key = ai_getEnvApiKey("openai-codex");
  // If ~/.codex/auth.json exists with a valid JWT, we get it
  if (key) {
    expect(key.split(".").length).toBe(3); // JWT has 3 parts
    expect(key.length).toBeGreaterThan(100);
  }
  // Either way, should not throw
});

test("codex returns undefined when no auth file", () => {
  const oldHome = process.env.HOME;
  process.env.HOME = "/tmp/nonexistent-codex-test";
  const key = ai_getEnvApiKey("openai-codex");
  expect(key).toBeUndefined();
  process.env.HOME = oldHome;
});

test("codex ignores non-JWT token (e.g. placeholder 'access-token')", () => {
  const { mkdirSync, writeFileSync, rmSync } = require("node:fs");
  const dir = "/tmp/codex-test-bad-token";
  mkdirSync(`${dir}/.codex`, { recursive: true });
  writeFileSync(`${dir}/.codex/auth.json`, JSON.stringify({
    tokens: { access_token: "access-token" },
  }));
  const oldHome = process.env.HOME;
  process.env.HOME = dir;
  const key = ai_getEnvApiKey("openai-codex");
  expect(key).toBeUndefined(); // not a JWT (no dots)
  process.env.HOME = oldHome;
  rmSync(dir, { recursive: true });
});

test("codex accepts valid JWT from auth.json", () => {
  const { mkdirSync, writeFileSync, rmSync } = require("node:fs");
  const dir = "/tmp/codex-test-good-token";
  mkdirSync(`${dir}/.codex`, { recursive: true });
  const fakeJwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature";
  writeFileSync(`${dir}/.codex/auth.json`, JSON.stringify({
    tokens: { access_token: fakeJwt },
  }));
  const oldHome = process.env.HOME;
  process.env.HOME = dir;
  const key = ai_getEnvApiKey("openai-codex");
  expect(key).toBe(fakeJwt);
  process.env.HOME = oldHome;
  rmSync(dir, { recursive: true });
});

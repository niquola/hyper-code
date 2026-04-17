import { test, expect } from "bun:test";
import ai_getEnvApiKey from "./getEnvApiKey.ts";

const HOME = process.env.HOME || "/tmp";

test("returns env var for known provider", () => {
  const env = { OPENAI_API_KEY: "test-key" };
  expect(ai_getEnvApiKey(HOME, "openai", env)).toBe("test-key");
});

test("returns undefined for unknown provider", () => {
  expect(ai_getEnvApiKey(HOME, "nonexistent", {})).toBeUndefined();
});

test("anthropic prefers oauth token", () => {
  const env = { ANTHROPIC_OAUTH_TOKEN: "oauth-tok", ANTHROPIC_API_KEY: "api-key" };
  expect(ai_getEnvApiKey(HOME, "anthropic", env)).toBe("oauth-tok");
});

test("anthropic falls back to api key", () => {
  const env = { ANTHROPIC_API_KEY: "api-key" };
  expect(ai_getEnvApiKey(HOME, "anthropic", env)).toBe("api-key");
});

test("codex reads JWT from ~/.codex/auth.json", () => {
  const key = ai_getEnvApiKey(HOME, "openai-codex", {});
  if (key) {
    expect(key.split(".").length).toBe(3);
    expect(key.length).toBeGreaterThan(100);
  }
});

test("codex returns undefined when no auth file", () => {
  const key = ai_getEnvApiKey("/tmp/nonexistent-codex-test", "openai-codex", {});
  expect(key).toBeUndefined();
});

test("codex ignores non-JWT token", () => {
  const { mkdirSync, writeFileSync, rmSync } = require("node:fs");
  const dir = "/tmp/codex-test-bad-token";
  mkdirSync(`${dir}/.codex`, { recursive: true });
  writeFileSync(`${dir}/.codex/auth.json`, JSON.stringify({ tokens: { access_token: "access-token" } }));
  const key = ai_getEnvApiKey(dir, "openai-codex", {});
  expect(key).toBeUndefined();
  rmSync(dir, { recursive: true });
});

test("codex accepts valid JWT from auth.json", () => {
  const { mkdirSync, writeFileSync, rmSync } = require("node:fs");
  const dir = "/tmp/codex-test-good-token";
  mkdirSync(`${dir}/.codex`, { recursive: true });
  const fakeJwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature";
  writeFileSync(`${dir}/.codex/auth.json`, JSON.stringify({ tokens: { access_token: fakeJwt } }));
  const key = ai_getEnvApiKey(dir, "openai-codex", {});
  expect(key).toBe(fakeJwt);
  rmSync(dir, { recursive: true });
});

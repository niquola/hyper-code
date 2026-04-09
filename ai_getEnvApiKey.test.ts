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

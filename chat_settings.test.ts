import { test, expect } from "bun:test";
import { chat_resolveModel, chat_resolveApiKey } from "./chat_settings.ts";
import type { ChatSettings } from "./chat_settings.ts";

test("resolveModel returns registry model for known provider", () => {
  const s: ChatSettings = { provider: "openai", modelId: "gpt-4o", apiKey: "" };
  const m = chat_resolveModel(s);
  expect(m.id).toBe("gpt-4o");
  expect(m.provider).toBe("openai");
});

test("resolveModel returns fallback for unknown model", () => {
  const s: ChatSettings = { provider: "lmstudio", modelId: "custom-model", apiKey: "" };
  const m = chat_resolveModel(s);
  expect(m.id).toBe("custom-model");
  expect(m.baseUrl).toBe("http://localhost:1234/v1");
});

test("resolveModel codex baseUrl", () => {
  const s: ChatSettings = { provider: "openai-codex", modelId: "gpt-5.2-codex", apiKey: "" };
  const m = chat_resolveModel(s);
  expect(m.baseUrl).toContain("chatgpt.com");
});

test("resolveApiKey returns settings key", () => {
  expect(chat_resolveApiKey({ provider: "test", modelId: "t", apiKey: "my-key" })).toBe("my-key");
});

test("resolveApiKey falls back to env", () => {
  const old = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "env-key";
  expect(chat_resolveApiKey({ provider: "openai", modelId: "t", apiKey: "" })).toBe("env-key");
  if (old) process.env.OPENAI_API_KEY = old; else delete process.env.OPENAI_API_KEY;
});

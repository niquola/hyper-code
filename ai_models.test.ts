import { test, expect, describe } from "bun:test";
import { AI_MODELS, ai_getModel, ai_getModels, ai_getProviders } from "./ai_models.ts";
import { ai_getEnvApiKey } from "./ai_getEnvApiKey.ts";

describe("AI_MODELS", () => {
  test("has many models from all providers", () => {
    const count = Object.keys(AI_MODELS).length;
    expect(count).toBeGreaterThan(100);
  });

  test("gpt-4o exists with correct fields", () => {
    const m = AI_MODELS["gpt-4o"]!;
    expect(m.id).toBe("gpt-4o");
    expect(m.provider).toBe("openai");
    expect(m.input).toContain("image");
    expect(m.reasoning).toBe(false);
  });

  test("claude models exist", () => {
    expect(AI_MODELS["claude-sonnet-4-20250514"]).toBeDefined();
  });

  test("o3-mini has reasoning", () => {
    expect(AI_MODELS["o3-mini"]!.reasoning).toBe(true);
  });
});

describe("ai_getModel", () => {
  test("finds model by provider + id", () => {
    const m = ai_getModel("openai", "gpt-4o");
    expect(m).toBeDefined();
    expect(m!.id).toBe("gpt-4o");
  });

  test("returns undefined for missing model", () => {
    expect(ai_getModel("openai", "nonexistent")).toBeUndefined();
  });

  test("returns undefined for missing provider", () => {
    expect(ai_getModel("nonexistent", "gpt-4o")).toBeUndefined();
  });
});

describe("ai_getModels", () => {
  test("returns all models for provider", () => {
    const models = ai_getModels("openai");
    expect(models.length).toBeGreaterThan(10);
  });

  test("returns empty for unknown provider", () => {
    expect(ai_getModels("nonexistent")).toEqual([]);
  });
});

describe("ai_getProviders", () => {
  test("returns all providers", () => {
    const providers = ai_getProviders();
    expect(providers).toContain("openai");
    expect(providers).toContain("anthropic");
    expect(providers).toContain("google");
    expect(providers).toContain("groq");
    expect(providers.length).toBeGreaterThan(10);
  });
});

describe("ai_getEnvApiKey", () => {
  test("maps openai to OPENAI_API_KEY", () => {
    const orig = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test";
    expect(ai_getEnvApiKey("openai")).toBe("sk-test");
    if (orig) process.env.OPENAI_API_KEY = orig;
    else delete process.env.OPENAI_API_KEY;
  });

  test("maps anthropic with OAuth precedence", () => {
    const origKey = process.env.ANTHROPIC_API_KEY;
    const origOauth = process.env.ANTHROPIC_OAUTH_TOKEN;
    process.env.ANTHROPIC_API_KEY = "key";
    process.env.ANTHROPIC_OAUTH_TOKEN = "oauth";
    expect(ai_getEnvApiKey("anthropic")).toBe("oauth");
    delete process.env.ANTHROPIC_OAUTH_TOKEN;
    expect(ai_getEnvApiKey("anthropic")).toBe("key");
    if (origKey) process.env.ANTHROPIC_API_KEY = origKey; else delete process.env.ANTHROPIC_API_KEY;
    if (origOauth) process.env.ANTHROPIC_OAUTH_TOKEN = origOauth;
  });

  test("maps groq to GROQ_API_KEY", () => {
    const orig = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = "gsk-test";
    expect(ai_getEnvApiKey("groq")).toBe("gsk-test");
    if (orig) process.env.GROQ_API_KEY = orig;
    else delete process.env.GROQ_API_KEY;
  });

  test("returns undefined for unknown provider", () => {
    expect(ai_getEnvApiKey("random")).toBeUndefined();
  });
});

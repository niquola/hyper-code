import { test, expect, describe } from "bun:test";
import { AI_MODELS } from "./ai_models.ts";
import { ai_getEnvApiKey } from "./ai_getEnvApiKey.ts";

describe("AI_MODELS", () => {
  test("all models have required fields", () => {
    for (const [id, model] of Object.entries(AI_MODELS)) {
      expect(model.id).toBe(id);
      expect(model.name).toBeTruthy();
      expect(model.provider).toBeTruthy();
      expect(model.baseUrl).toBeTruthy();
      expect(model.contextWindow).toBeGreaterThan(0);
      expect(model.maxTokens).toBeGreaterThan(0);
      expect(model.input).toContain("text");
      expect(model.cost).toBeDefined();
    }
  });

  test("gpt-4o supports images", () => {
    expect(AI_MODELS["gpt-4o"]!.input).toContain("image");
  });

  test("o3-mini has reasoning", () => {
    expect(AI_MODELS["o3-mini"]!.reasoning).toBe(true);
  });

  test("gpt-4o does not have reasoning", () => {
    expect(AI_MODELS["gpt-4o"]!.reasoning).toBe(false);
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

  test("returns undefined when env var not set", () => {
    const orig = process.env.XAI_API_KEY;
    delete process.env.XAI_API_KEY;
    expect(ai_getEnvApiKey("xai")).toBeUndefined();
    if (orig) process.env.XAI_API_KEY = orig;
  });
});

import { test, expect, describe } from "bun:test";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Model } from "./ai_type_Model.ts";
import { agent_createCtx } from "./agent_createCtx.ts";
import { ai_models_getAll, ai_getModel, ai_getModels, ai_getProviders } from "./ai_models.ts";
import { ai_models_loadIndex } from "./ai_models_loadIndex.ts";
import { ai_getEnvApiKey } from "./ai_getEnvApiKey.ts";

const M: Model = { id: "t", name: "T", provider: "test", baseUrl: "", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 };

async function createCtx(): Promise<Ctx> {
  const cwd = process.cwd();
  const modelIndex = await ai_models_loadIndex(cwd);
  return agent_createCtx({ model: M, apiKey: "k", db: {} as any, cwd, modelIndex });
}

describe("ai_models_getAll", () => {
  test("has many models from all providers", async () => {
    const ctx = await createCtx();
    const all = await ai_models_getAll(ctx);
    const count = Object.keys(all).length;
    expect(count).toBeGreaterThan(100);
  });

  test("gpt-4o exists with correct fields", async () => {
    const ctx = await createCtx();
    const all = await ai_models_getAll(ctx);
    const m = all["gpt-4o"]!;
    expect(m.id).toBe("gpt-4o");
    expect(m.provider).toBe("openai");
    expect(m.input).toContain("image");
    expect(m.reasoning).toBe(false);
  });

  test("claude models exist", async () => {
    const ctx = await createCtx();
    const all = await ai_models_getAll(ctx);
    expect(all["claude-sonnet-4-20250514"]).toBeDefined();
  });

  test("o3-mini has reasoning", async () => {
    const ctx = await createCtx();
    const all = await ai_models_getAll(ctx);
    expect(all["o3-mini"]!.reasoning).toBe(true);
  });
});

describe("ai_getModel", () => {
  test("finds model by provider + id", async () => {
    const ctx = await createCtx();
    const m = await ai_getModel(ctx, "openai", "gpt-4o");
    expect(m).toBeDefined();
    expect(m!.id).toBe("gpt-4o");
  });

  test("returns undefined for missing model", async () => {
    const ctx = await createCtx();
    expect(await ai_getModel(ctx, "openai", "nonexistent")).toBeUndefined();
  });

  test("returns undefined for missing provider", async () => {
    const ctx = await createCtx();
    expect(await ai_getModel(ctx, "nonexistent", "gpt-4o")).toBeUndefined();
  });
});

describe("ai_getModels", () => {
  test("returns all models for provider", async () => {
    const ctx = await createCtx();
    const models = await ai_getModels(ctx, "openai");
    expect(models.length).toBeGreaterThan(10);
  });

  test("returns empty for unknown provider", async () => {
    const ctx = await createCtx();
    expect(await ai_getModels(ctx, "nonexistent")).toEqual([]);
  });
});

describe("ai_getProviders", () => {
  test("returns all providers", async () => {
    const ctx = await createCtx();
    const providers = ai_getProviders(ctx);
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

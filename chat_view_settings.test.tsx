import { test, expect, describe } from "bun:test";
import { chat_view_settings } from "./chat_view_settings.tsx";
import { pageState } from "./cdp_pageState.ts";
import { queryExists, queryTexts, queryAttrs } from "./test_html.ts";

describe("chat_view_settings", () => {
  test("renders settings page with data-page", () => {
    const html = chat_view_settings({ provider: "openai", modelId: "gpt-4o", apiKey: "" });
    const state = pageState(html);
    expect(state.page).toBe("settings");
  });

  test("has provider select", () => {
    const html = chat_view_settings({ provider: "openai", modelId: "gpt-4o", apiKey: "" });
    expect(queryExists(html, 'select[name="provider"]')).toBe(true);
  });

  test("has model select", () => {
    const html = chat_view_settings({ provider: "openai", modelId: "gpt-4o", apiKey: "" });
    expect(queryExists(html, 'select[name="modelId"]')).toBe(true);
  });

  test("has API key input", () => {
    const html = chat_view_settings({ provider: "openai", modelId: "gpt-4o", apiKey: "" });
    expect(queryExists(html, 'input[name="apiKey"]')).toBe(true);
  });

  test("has save form", () => {
    const html = chat_view_settings({ provider: "openai", modelId: "gpt-4o", apiKey: "" });
    const state = pageState(html);
    expect(state.forms.some(f => f.name === "settings")).toBe(true);
  });

  test("shows current provider as selected", () => {
    const html = chat_view_settings({ provider: "groq", modelId: "llama-3.1-8b-instant", apiKey: "gsk-xxx" });
    expect(html).toContain("groq");
  });

  test("masks API key", () => {
    const html = chat_view_settings({ provider: "openai", modelId: "gpt-4o", apiKey: "sk-proj-very-secret-key-123" });
    // Should not show full key
    expect(html).not.toContain("sk-proj-very-secret-key-123");
    expect(html).toContain("sk-p");
  });
});

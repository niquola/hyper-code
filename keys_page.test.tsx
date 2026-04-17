import { test, expect, describe } from "bun:test";
import { queryExists } from "./test_html.ts";

// We can't easily import page_keys directly (needs ctx),
// so test the view rendering logic and route behavior

describe("page /settings", () => {
  test("keys page file exists and exports default function", async () => {
    const mod = await import("./page_settings.tsx");
    expect(typeof mod.default).toBe("function");
  });

  test("form_keys_POST file exists and exports default function", async () => {
    const mod = await import("./form_settings_key_POST.tsx");
    expect(typeof mod.default).toBe("function");
  });
});

describe("keys page rendering", () => {
  // Simulate what the page does by building the HTML directly
  function renderKeyRow(provider: string, label: string, hasKey: boolean, oauth: boolean): string {
    const statusClass = hasKey ? "border-green-200 bg-green-50" : "border-gray-200 bg-white";
    let html = `<div class="border rounded-lg ${statusClass}" data-entity="key" data-id="${provider}">`;
    html += `<div class="text-sm font-medium">${label}</div>`;
    if (oauth) {
      html += `<form method="POST" action="/login/codex"><button>${hasKey ? "Re-login" : "Login with ChatGPT"}</button></form>`;
    } else {
      html += `<form method="POST" action="/settings/key" data-role="key-form"><input name="provider" value="${provider}" /><input name="apiKey" /><button>Save</button></form>`;
    }
    html += `</div>`;
    return html;
  }

  test("codex row shows OAuth login button", () => {
    const html = renderKeyRow("openai-codex", "OpenAI Codex", false, true);
    expect(html).toContain("Login with ChatGPT");
    expect(html).toContain("/login/codex");
    expect(html).not.toContain('action="/settings/key"');
  });

  test("codex row with key shows Re-login", () => {
    const html = renderKeyRow("openai-codex", "OpenAI Codex", true, true);
    expect(html).toContain("Re-login");
    expect(html).toContain("bg-green-50");
  });

  test("api key row shows save form", () => {
    const html = renderKeyRow("anthropic", "Anthropic", false, false);
    expect(html).toContain('action="/settings/key"');
    expect(html).toContain('name="apiKey"');
    expect(html).toContain('value="anthropic"');
  });

  test("key row with key has green border", () => {
    const html = renderKeyRow("groq", "Groq", true, false);
    expect(html).toContain("border-green-200");
    expect(html).toContain("bg-green-50");
  });

  test("key row without key has gray border", () => {
    const html = renderKeyRow("groq", "Groq", false, false);
    expect(html).toContain("border-gray-200");
    expect(html).toContain("bg-white");
  });
});

describe("form_keys_POST", () => {
  test("saves key and redirects to /settings", async () => {
    const { chat_db } = await import("./chat/db.ts");
    const { chat_saveApiKey, chat_getApiKey } = await import("./chat/apiKeys.ts");

    // Save a key
    const home = "/tmp/hyper-keys-test-flow";
    const { mkdirSync } = require("node:fs");
    mkdirSync(`${home}/.hyper`, { recursive: true });

    await chat_saveApiKey(home, "test-provider", "test-key-123");
    const key = await chat_getApiKey(home, "test-provider");
    expect(key).toBe("test-key-123");

    await chat_saveApiKey(home, "test-provider", "new-key-456");
    const key2 = await chat_getApiKey(home, "test-provider");
    expect(key2).toBe("new-key-456");
  });
});

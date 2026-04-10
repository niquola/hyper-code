import type { Ctx } from "./agent_type_Ctx.ts";
import { layout_view_page } from "./layout_view_page.tsx";
import { chat_getApiKey } from "./chat_apiKeys.ts";
import { chat_loadSettings } from "./chat_settings.ts";
import { ai_getProviders, ai_getModels } from "./ai_models.ts";
import { escapeHtml } from "./jsx.ts";

type KeyInfo = {
  provider: string;
  label: string;
  hasKey: boolean;
  source: string; // "env", "keys.json", "auto" (cli creds), "oauth", ""
  masked: string;
  expires?: string;
  oauth?: boolean; // has OAuth flow
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "****" : "";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

function detectSource(provider: string, key: string): string {
  if (!key) return "";
  // Check env first
  const { ai_getEnvApiKey } = require("./ai_getEnvApiKey.ts");
  const envKey = ai_getEnvApiKey(provider);
  if (envKey === key) {
    if (provider === "openai-codex") return "auto (~/.codex/auth.json)";
    if (provider === "kimi-coding") return "auto (~/.kimi/credentials/)";
    return "env";
  }
  return "keys.json";
}

function jwtExpiry(token: string): string | undefined {
  try {
    if (token.split(".").length !== 3) return undefined;
    const payload = JSON.parse(atob(token.split(".")[1]!));
    const exp = payload.exp;
    if (!exp) return undefined;
    const d = new Date(exp * 1000);
    const now = Date.now();
    if (d.getTime() < now) return `expired (${d.toLocaleDateString()})`;
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  } catch { return undefined; }
}

const PROVIDERS: { provider: string; label: string; oauth?: boolean }[] = [
  { provider: "openai-codex", label: "OpenAI Codex (ChatGPT Plus/Pro)", oauth: true },
  { provider: "kimi-coding", label: "Kimi Coding" },
  { provider: "anthropic", label: "Anthropic" },
  { provider: "openai", label: "OpenAI" },
  { provider: "groq", label: "Groq" },
  { provider: "openrouter", label: "OpenRouter" },
  { provider: "google", label: "Google (Gemini)" },
  { provider: "xai", label: "xAI (Grok)" },
];

export default async function (ctx: Ctx, req: Request) {
  const settings = await chat_loadSettings();
  const url = new URL(req.url, "http://localhost");
  const currentProvider = url.searchParams.get("provider") || settings.provider;
  const providers = ai_getProviders(ctx);
  const models = await ai_getModels(ctx, currentProvider);

  const keys: KeyInfo[] = [];
  for (const p of PROVIDERS) {
    const key = await chat_getApiKey(p.provider);
    keys.push({
      provider: p.provider,
      label: p.label,
      hasKey: !!key,
      source: detectSource(p.provider, key),
      masked: maskKey(key),
      expires: key ? jwtExpiry(key) : undefined,
      oauth: p.oauth,
    });
  }

  const body = (
    <div data-page="settings" className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back</a>
      </div>

      <form data-form="settings" method="POST" action="/settings" className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Provider</label>
          <select name="provider" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" onchange="this.form.submit()">
            {providers.map((p) => (
              <option value={p} selected={p === currentProvider}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Model</label>
          <select name="modelId" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
            {models.map((m) => (
              <option value={m.id} selected={m.id === settings.modelId}>
                {m.name}{m.reasoning ? " (reasoning)" : ""} — {m.contextWindow / 1000}K
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition text-sm">Save</button>
      </form>

      <h3 className="text-lg font-semibold text-gray-900 mb-3">API Keys</h3>
      <div className="space-y-3">
        {keys.map((k) => (
          <div className={`border rounded-lg px-4 py-3 ${k.hasKey ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`} data-entity="key" data-id={k.provider}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{k.label}</div>
                <div className="text-xs text-gray-500">
                  {k.provider}
                  {k.hasKey && <span className="ml-2 text-green-600">{k.masked}</span>}
                  {k.source && <span className="ml-2 text-gray-400">via {k.source}</span>}
                  {k.expires && <span className="ml-2 text-gray-400">exp: {k.expires}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {k.oauth && (
                  <form method="POST" action="/login/codex" className="m-0">
                    <button type="submit" className={`text-xs px-3 py-1 rounded ${k.hasKey ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-green-600 text-white hover:bg-green-700"}`}>
                      {k.hasKey ? "Re-login" : "Login with ChatGPT"}
                    </button>
                  </form>
                )}
                {!k.oauth && (
                  <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onclick={`this.closest('[data-entity=key]').querySelector('[data-role=key-form]').classList.toggle('hidden')`}>
                    {k.hasKey ? "Update" : "Set key"}
                  </button>
                )}
              </div>
            </div>
            {!k.oauth && (
              <form method="POST" action="/settings/key" data-role="key-form" className="hidden mt-3 flex gap-2">
                <input type="hidden" name="provider" value={k.provider} />
                <input type="password" name="apiKey" placeholder="Paste API key..." className="flex-1 text-sm px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button type="submit" className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700">Save</button>
              </form>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-xs text-gray-400">
        <p>Priority: ENV → ~/.hyper/keys.json → auto-detect (CLI credentials)</p>
      </div>
    </div>
  );

  return layout_view_page("Settings — Hyper Code", body);
}

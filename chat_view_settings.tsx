import { ai_getProviders, ai_getModels } from "./ai_models.ts";
import type { Model } from "./ai_type_Model.ts";

export type SettingsData = {
  provider: string;
  modelId: string;
  apiKey: string;
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "****" : "";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

export function chat_view_settings(data: SettingsData): string {
  const registryProviders = ai_getProviders();
  // Add custom providers not in registry
  const providers = registryProviders.includes(data.provider) ? registryProviders : [data.provider, ...registryProviders];
  const models = ai_getModels(data.provider);

  return (
    <div data-page="settings" className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Settings</h2>

      <form data-form="settings" method="POST" action="/settings" className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            name="provider"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onchange="this.form.submit()"
          >
            {providers.map((p) => (
              <option value={p} selected={p === data.provider}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select
            name="modelId"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {models.map((m) => (
              <option value={m.id} selected={m.id === data.modelId}>
                {m.name}{m.reasoning ? " (reasoning)" : ""} — {m.contextWindow / 1000}K ctx
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            name="apiKey"
            type="password"
            placeholder={data.apiKey ? maskKey(data.apiKey) : "Enter API key..."}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Leave empty to keep current key. Env vars are also checked.</p>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" data-action="save" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition">Save</button>
          <a href="/" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</a>
        </div>
      </form>

      {data.apiKey && (
        <div className="mt-4 text-xs text-gray-400">
          Current key: {maskKey(data.apiKey)}
        </div>
      )}
    </div>
  );
}

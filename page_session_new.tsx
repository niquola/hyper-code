import { layout_view_page } from "./layout_view_page.tsx";
import { chat_loadSettings } from "./chat_settings.ts";
import { ai_getProviders, ai_getModels } from "./ai_models.ts";
import { chat_getCtx } from "./chat_ctx.ts";

export default async function (req: Request) {
  const settings = await chat_loadSettings();
  const ctx = await chat_getCtx();
  const providers = ai_getProviders();
  const allProviders = providers.includes(settings.provider) ? providers : [settings.provider, ...providers];
  const models = ai_getModels(settings.provider);

  const body = (
    <div data-page="new-session" className="flex flex-col h-full items-center justify-center">
      <div className="w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-900 mb-6">New Session</h2>

        <form method="POST" action="/session/create" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
            <input
              type="text"
              name="title"
              placeholder="Auto-generated from first message"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select name="provider" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
              {allProviders.map((p) => (
                <option value={p} selected={p === settings.provider}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <select name="modelId" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
              {models.map((m) => (
                <option value={m.id} selected={m.id === settings.modelId}>{m.name || m.id}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition text-sm">Create Session</button>
            <a href="/" className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  );

  return layout_view_page("New Session", body, ctx.model.name || ctx.model.id);
}

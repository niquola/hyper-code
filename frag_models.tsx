import { ai_getModels } from "./ai_models.ts";

export default async function (req: Request) {
  const url = new URL(req.url, "http://localhost");
  const provider = url.searchParams.get("provider") || "";
  const models = ai_getModels(provider);

  let html = `<select id="model-select" name="modelId" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">`;
  for (const m of models) {
    html += `<option value="${m.id}">${m.name || m.id}</option>`;
  }
  if (models.length === 0) html += `<option value="">No models for ${provider}</option>`;
  html += `</select>`;
  return html;
}

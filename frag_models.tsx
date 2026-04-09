import { ai_getModels } from "./ai_models.ts";
import type { Ctx } from "./agent_type_Ctx.ts";

export default async function (ctx: Ctx, req: Request) {
  const url = new URL(req.url, "http://localhost");
  const provider = url.searchParams.get("provider") || "";
  const models = ai_getModels(provider);

  let html = "";
  for (const m of models) {
    html += `<option value="${m.id}">${m.name || m.id}</option>`;
  }
  if (models.length === 0) html += `<option value="">No models for ${provider}</option>`;
  return html;
}

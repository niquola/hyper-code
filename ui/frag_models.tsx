import { ai_getModels } from "../ai/getModels.ts";
import type { Ctx } from "../agent/type_Ctx.ts";

export default async function (ctx: Ctx, req: Request) {
  const url = new URL(req.url, "http://localhost");
  const provider = url.searchParams.get("provider") || "";
  const models = await ai_getModels(ctx, provider);

  let html = "";
  for (const m of models) {
    html += `<option value="${m.id}">${m.name || m.id}</option>`;
  }
  if (models.length === 0) html += `<option value="">No models for ${provider}</option>`;
  return html;
}

import type { ModelIndex } from "../ai/type_ModelIndex.ts";

export async function ai_models_loadIndex(cwd: string): Promise<ModelIndex> {
  const indexPath = `${cwd}/ai_models/index.json`;
  const file = Bun.file(indexPath);
  if (!(await file.exists())) return { providers: [] };
  const data = await file.json();
  return data as ModelIndex;
}

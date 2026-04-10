import type { Model } from "./ai_type_Model.ts";

export async function ai_models_readProvider(cwd: string, provider: string): Promise<Record<string, Model> | null> {
  const path = `${cwd}/ai_models/providers/${provider}.json`;
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  const data = await file.json();
  return data as Record<string, Model>;
}

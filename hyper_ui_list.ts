import { readdirSync } from "node:fs";

export type HyperUIWidget = {
  name: string;
  file: string;
  ext: string;
};

// Detects hyper_ui_<name>.ts/py/sh files (prefix convention)
export async function hyper_ui_list(cwd: string): Promise<HyperUIWidget[]> {
  const widgets: HyperUIWidget[] = [];
  try {
    const entries = readdirSync(cwd);
    for (const entry of entries) {
      const match = entry.match(/^hyper_ui_([^.]+)\.(\w+)$/);
      if (match && ["ts", "js", "py", "sh"].includes(match[2]!)) {
        widgets.push({ name: match[1]!, file: entry, ext: match[2]! });
      }
    }
  } catch {}
  return widgets.sort((a, b) => a.name.localeCompare(b.name));
}

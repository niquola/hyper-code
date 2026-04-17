import stripLineNumbers from "./stripLineNumbers.ts";

export default function getToolCode(toolName: string, argsJson: string, result?: string): string | null {
  if (toolName === "read" && result) return stripLineNumbers(result);
  if (toolName === "write") { try { return JSON.parse(argsJson).content; } catch { return null; } }
  if (toolName === "edit" && result) {
    const lines = result.split("\n");
    const diffStart = lines.findIndex(l => l.startsWith("- ") || l.startsWith("+ "));
    if (diffStart >= 0) return lines.slice(diffStart).join("\n");
    return null;
  }
  return null;
}

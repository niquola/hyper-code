function stripLines(text: string): string {
  return text.split("\n").map(l => { const m = l.match(/^\d+\t(.*)/); return m ? m[1]! : l; }).join("\n");
}

export default function getToolCode(toolName: string, argsJson: string, result?: string): string | null {
  if (toolName === "read" && result) return stripLines(result);
  if (toolName === "write") { try { return JSON.parse(argsJson).content; } catch { return null; } }
  if (toolName === "edit" && result) {
    const lines = result.split("\n");
    const diffStart = lines.findIndex(l => l.startsWith("- ") || l.startsWith("+ "));
    if (diffStart >= 0) return lines.slice(diffStart).join("\n");
    return null;
  }
  return null;
}

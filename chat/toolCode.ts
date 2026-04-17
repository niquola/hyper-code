// Extract code and language from tool call args/result for syntax highlighting

const TOOLS_WITH_PATH = new Set(["read", "write", "edit"]);

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
  json: "json", css: "css", html: "html", sql: "sql",
  py: "python", rb: "ruby", go: "go", rs: "rust",
  java: "java", yaml: "yaml", yml: "yaml", toml: "toml",
  sh: "bash", bash: "bash", md: "markdown", xml: "xml",
  dockerfile: "dockerfile", diff: "diff",
};

export function detectToolLang(toolName: string, argsJson: string): string | null {
  if (toolName === "edit") return "diff";
  if (!TOOLS_WITH_PATH.has(toolName)) return null;
  try {
    const parsed = JSON.parse(argsJson);
    const path = parsed.path as string;
    const ext = path.split(".").pop()?.toLowerCase();
    return ext ? EXT_TO_LANG[ext] ?? null : null;
  } catch { return null; }
}

export function stripLineNumbers(text: string): string {
  return text.split("\n").map(l => {
    const m = l.match(/^\d+\t(.*)/);
    return m ? m[1]! : l;
  }).join("\n");
}

export function getToolCode(toolName: string, argsJson: string, result?: string): string | null {
  if (toolName === "read" && result) {
    return stripLineNumbers(result);
  }
  if (toolName === "write") {
    try { return JSON.parse(argsJson).content; } catch { return null; }
  }
  if (toolName === "edit" && result) {
    // Result already contains diff lines (- old / + new)
    const lines = result.split("\n");
    const diffStart = lines.findIndex(l => l.startsWith("- ") || l.startsWith("+ "));
    if (diffStart >= 0) return lines.slice(diffStart).join("\n");
    return null;
  }
  return null;
}

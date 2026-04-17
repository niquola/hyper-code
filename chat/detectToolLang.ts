const TOOLS_WITH_PATH = new Set(["read", "write", "edit"]);
const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
  json: "json", css: "css", html: "html", sql: "sql",
  py: "python", rb: "ruby", go: "go", rs: "rust",
  java: "java", yaml: "yaml", yml: "yaml", toml: "toml",
  sh: "bash", bash: "bash", md: "markdown", xml: "xml",
  dockerfile: "dockerfile", diff: "diff",
};

export default function detectToolLang(toolName: string, argsJson: string): string | null {
  if (toolName === "edit") return "diff";
  if (!TOOLS_WITH_PATH.has(toolName)) return null;
  try {
    const parsed = JSON.parse(argsJson);
    const path = parsed.path as string;
    const ext = path.split(".").pop()?.toLowerCase();
    return ext ? EXT_TO_LANG[ext] ?? null : null;
  } catch { return null; }
}

import { createHighlighter, type Highlighter } from "shiki";

let _highlighter: Highlighter | null = null;

const LANGS = [
  "javascript", "typescript", "tsx", "jsx", "json", "css", "html",
  "sql", "python", "markdown", "xml", "rust", "java", "go",
  "yaml", "bash", "shell", "dockerfile", "toml", "diff",
] as const;

const LANG_ALIASES: Record<string, string> = {
  js: "javascript", ts: "typescript", sh: "bash", zsh: "bash",
  yml: "yaml", py: "python", rb: "ruby", txt: "text", plain: "text",
};

async function getHighlighter(): Promise<Highlighter> {
  if (!_highlighter) {
    _highlighter = await createHighlighter({
      themes: ["github-dark"],
      langs: [...LANGS],
    });
  }
  return _highlighter;
}

function normalizeLang(lang: string): string {
  const l = lang.split(/[#\s]/)[0]!.toLowerCase().trim();
  return LANG_ALIASES[l] || l;
}

export async function ai_highlightCode(code: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  const loadedLangs = new Set(hl.getLoadedLanguages());
  const normalized = normalizeLang(lang);
  if (loadedLangs.has(normalized)) {
    try { return hl.codeToHtml(code, { lang: normalized, theme: "github-dark" }); } catch {}
  }
  return `<pre style="background:#0d1117;color:#e6edf3;padding:1rem;border-radius:0.5rem;overflow-x:auto;font-size:12px"><code>${code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</code></pre>`;
}

export async function ai_renderMarkdown(text: string): Promise<string> {
  if (!text.trim()) return "";

  const rawHtml: string = (Bun as any).markdown.html(text);
  const hl = await getHighlighter();
  const loadedLangs = new Set(hl.getLoadedLanguages());

  // Post-process: highlight <pre><code class="language-*"> blocks
  const html = rawHtml.replace(
    /<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang: string, escaped: string) => {
      const normalized = normalizeLang(lang);
      const raw = escaped
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'").replace(/&#x27;/g, "'");

      if (loadedLangs.has(normalized)) {
        try {
          return hl.codeToHtml(raw, { lang: normalized, theme: "github-dark" });
        } catch {}
      }
      return `<pre style="background:#0d1117;color:#e6edf3;padding:1rem;border-radius:0.5rem;overflow-x:auto"><code>${escaped}</code></pre>`;
    },
  );

  return html;
}

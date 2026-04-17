
const LANG_ALIASES: Record<string, string> = {
  js: "javascript", ts: "typescript", sh: "bash", zsh: "bash",
  yml: "yaml", py: "python", rb: "ruby", txt: "text", plain: "text",
};

function normalizeLang(lang: string): string {
  const l = lang.split(/[#\s]/)[0]!.toLowerCase().trim();
  return LANG_ALIASES[l] || l;
}

export default async function ai_renderMarkdown(text: string): Promise<string> {
  if (!text.trim()) return "";
  const rawHtml: string = (Bun as any).markdown.html(text);
  const hl = await (await import("./highlightCode.ts")).getHighlighter();
  const loadedLangs = new Set(hl.getLoadedLanguages());

  return rawHtml.replace(
    /<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang: string, escaped: string) => {
      const normalized = normalizeLang(lang);
      const raw = escaped.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
      if (loadedLangs.has(normalized)) {
        try { return hl.codeToHtml(raw, { lang: normalized, theme: "github-light" }); } catch {}
      }
      return `<pre style="background:#0d1117;color:#e6edf3;padding:1rem;border-radius:0.5rem;overflow-x:auto"><code>${escaped}</code></pre>`;
    },
  );
}

// HTML query helper for tests. Uses Bun's built-in HTMLRewriter with CSS selectors.

export function queryAll(html: string, selector: string): string[] {
  const results: string[] = [];
  new HTMLRewriter()
    .on(selector, {
      element(el) {
        const chunks: string[] = [];
        el.onEndTag(() => { /* noop, just need to capture */ });
      },
      text(text) {
        results.push(text.text);
      },
    })
    .transform(html);
  return results.filter(Boolean);
}

export function queryTexts(html: string, selector: string): string[] {
  const results: string[] = [];
  new HTMLRewriter()
    .on(selector, {
      text(t) { if (t.text.trim()) results.push(t.text.trim()); },
    })
    .transform(html);
  return results;
}

export function queryAttrs(html: string, selector: string, attr: string): string[] {
  const results: string[] = [];
  new HTMLRewriter()
    .on(selector, {
      element(el) {
        const val = el.getAttribute(attr);
        if (val !== null) results.push(val);
      },
    })
    .transform(html);
  return results;
}

export function queryCount(html: string, selector: string): number {
  let count = 0;
  new HTMLRewriter()
    .on(selector, { element() { count++; } })
    .transform(html);
  return count;
}

export function queryExists(html: string, selector: string): boolean {
  return queryCount(html, selector) > 0;
}

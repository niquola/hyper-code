type Handler = (req: Request, params: Record<string, string>) => Promise<string | Response | null>;

// page_chat.tsx                    → GET /chat (full page)
// frag_chat_messages.tsx           → GET /chat/messages (htmx fragment)
// form_chat_POST.tsx               → POST /chat
// api_status_GET.tsx               → GET /api/status (JSON)

function parsePath(parts: string[]): string {
  const mapped = parts.map((p) => (p.startsWith("$") ? ":" + p.slice(1) : p));
  return "/" + mapped.join("/");
}

function parsePageFile(filename: string): { method: string; path: string } {
  const name = filename.replace(/\.tsx?$/, "").replace(/^page_/, "");
  if (name === "index") return { method: "GET", path: "/" };
  return { method: "GET", path: parsePath(name.split("_")) };
}

function parseFragFile(filename: string): { method: string; path: string } {
  const name = filename.replace(/\.tsx?$/, "").replace(/^frag_/, "");
  return { method: "GET", path: parsePath(name.split("_")) };
}

function parseFormFile(filename: string): { method: string; path: string } {
  const name = filename.replace(/\.tsx?$/, "").replace(/^form_/, "");
  const parts = name.split("_");
  const method = parts[parts.length - 1]!;
  const pathParts = parts.slice(0, -1);
  return { method, path: parsePath(pathParts) };
}

function parseApiFile(filename: string): { method: string; path: string } {
  const name = filename.replace(/\.tsx?$/, "").replace(/^api_/, "");
  const parts = name.split("_");
  const method = parts[parts.length - 1]!;
  const pathParts = parts.slice(0, -1);
  return { method, path: "/api" + parsePath(pathParts) };
}

export async function router_buildRoutes(dir: string) {
  const globs = [
    { glob: new Bun.Glob("page_*.tsx"), parse: parsePageFile },
    { glob: new Bun.Glob("frag_*.tsx"), parse: parseFragFile },
    { glob: new Bun.Glob("form_*.tsx"), parse: parseFormFile },
    { glob: new Bun.Glob("api_*.tsx"), parse: parseApiFile },
  ];

  const routes: Record<string, Record<string, Function>> = {};

  for (const { glob, parse } of globs) {
    const files = Array.from(glob.scanSync(dir)).sort();
    for (const file of files) {
      const { method, path } = parse(file);
      const mod = await import(`${dir}/${file}`);
      const handler: Handler = mod.default;

      if (!routes[path]) routes[path] = {};
      routes[path]![method] = async (req: Request) => {
        const result = await handler(req, (req as any).params ?? {});
        if (result === null) return new Response("not found", { status: 404 });
        if (result instanceof Response) return result;
        return new Response(result, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      };
    }
  }

  return routes;
}

// Entry point — load namespaces, start server (with REPL), watch files
import { loader_loadAll, loader_loadFile, loader_watch, loader_genTypes } from "./loader.ts";
import start from "./server/start.ts";

const ctx: any = {};
const projectDir = ".";

// Load all namespaces
const loaded = await loader_loadAll(ctx, projectDir);
await loader_genTypes(projectDir);
console.log(`[loader] ${loaded.length} modules loaded`);

// REPL handler
async function handleRepl(body: any) {
  if (body.op === "load_all") {
    const res = await loader_loadAll(ctx, projectDir);
    await loader_genTypes(projectDir);
    return { loaded: res, count: res.length };
  }
  if (body.op === "reload") {
    const result = await loader_loadFile(ctx, projectDir, body.path);
    return result ? { ok: true, ...result } : { error: "no default export" };
  }
  if (body.op === "eval") {
    const names: string[] = [];
    const values: any[] = [];
    for (const [ns, fns] of Object.entries(ctx)) {
      if (typeof fns !== "object" || fns === null || ns === "_meta") continue;
      if (!names.includes(ns)) { names.push(ns); values.push(fns); }
      for (const [name, fn] of Object.entries(fns as any)) {
        if (typeof fn !== "function") continue;
        if (!names.includes(name)) { names.push(name); values.push(fn); }
      }
    }
    const fn = new Function(...names, "ctx", `return (async () => (${body.code}))()`);
    const result = await fn(...values, ctx);
    return { result: String(result) };
  }
  if (body.op === "gen_types") {
    await loader_genTypes(projectDir);
    return { ok: true };
  }
  return { error: "unknown op" };
}

// Expose repl handler globally for api_repl_POST.ts
(globalThis as any).__repl = handleRepl;

// Start server
await start();

// File watcher — hot reload
loader_watch(ctx, projectDir, () => {});

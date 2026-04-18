// Entry point — create ctx, load namespaces, start server, REPL, file watcher
import { loader_loadAll, loader_loadFile, loader_watch, loader_genTypes } from "./loader.ts";
import agent_createCtx from "./agent/createCtx.ts";
import agent_buildSystemPrompt from "./agent/buildSystemPrompt.ts";
import chat_db from "./chat/db.ts";
import ai_models_loadIndex from "./ai/models_loadIndex.ts";
import build_tools from "./tool/build_tools.ts";
import start from "./server/start.ts";

const projectDir = process.cwd();
const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
const env = { ...process.env } as Record<string, string | undefined>;

// --- Create ctx ---
const db = chat_db();

// Load all namespaces into temp ctx for tool discovery
const tempCtx: any = { cwd: projectDir, home, env, db };
const loaded = await loader_loadAll(tempCtx, projectDir);
await loader_genTypes(projectDir);
console.log(`[loader] ${loaded.length} modules loaded`);

// Build tools from loaded tool/ namespace
const tools = build_tools(tempCtx);

// Resolve default model + api key
const chat_loadSettings = (await import("./chat/loadSettings.ts")).default;
const chat_resolveModel = (await import("./chat/resolveModel.ts")).default;
const chat_resolveApiKey = (await import("./chat/resolveApiKey.ts")).default;
const settings = await chat_loadSettings();
const model = await chat_resolveModel(projectDir, settings);
const apiKey = chat_resolveApiKey(home, settings);
const modelIndex = await ai_models_loadIndex(projectDir);

const ctx = agent_createCtx({
  model, apiKey,
  systemPrompt: agent_buildSystemPrompt(projectDir, tools),
  tools, db,
  cwd: projectDir, home, env,
  modelIndex,
});

// Copy namespace functions from loader onto ctx
for (const [ns, fns] of Object.entries(tempCtx)) {
  if (ns === '_meta' || ns === 'cwd' || ns === 'home' || ns === 'env' || ns === 'db') continue;
  if (typeof fns === 'object' && fns !== null) {
    (ctx as any)[ns] = fns;
  }
}
(ctx as any)._meta = tempCtx._meta;
(ctx as any).state = tempCtx.state || {};

// --- REPL handler ---
async function handleRepl(body: any) {
  if (body.op === "load_all") {
    const res = await loader_loadAll(tempCtx, projectDir);
    await loader_genTypes(projectDir);
    return { loaded: res, count: res.length };
  }
  if (body.op === "reload") {
    const result = await loader_loadFile(tempCtx, projectDir, body.path);
    return result ? { ok: true, ...result } : { error: "no default export" };
  }
  if (body.op === "eval") {
    const names: string[] = [];
    const values: any[] = [];
    for (const [ns, fns] of Object.entries(tempCtx)) {
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

(globalThis as any).__repl = handleRepl;

// --- Start modules ---
// Each module/start.ts initializes with ctx
import chat_start from "./chat/start.ts";
chat_start(ctx);

await start(ctx);

// --- File watcher ---
loader_watch(tempCtx, projectDir, () => {});

// Entry point — load all namespaces, start server, watch for changes
import { loader_loadAll, loader_watch, loader_genTypes } from "./loader.ts";
import start from "./server/start.ts";

// Build ctx with all namespaces loaded
const loaded = await loader_loadAll({}, ".");
console.log(`[loader] ${loaded.length} modules loaded`);

// Generate types
await loader_genTypes(".");

// Start HTTP server
const server = await start();

// Watch for file changes — hot reload
loader_watch({}, ".", () => {
  console.log("[watch] reloaded");
});

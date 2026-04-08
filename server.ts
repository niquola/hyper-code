import { router_buildRoutes } from "./router_buildRoutes.ts";

const routes = await router_buildRoutes(".");

const server = Bun.serve({
  port: 0,
  routes,
});

await Bun.write(".port", String(server.port));
console.log(`http://localhost:${server.port}`);

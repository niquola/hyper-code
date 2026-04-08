import { test, expect, describe } from "bun:test";
import { router_buildRoutes } from "./router_buildRoutes.ts";

describe("router_buildRoutes", () => {
  test("discovers page_index.tsx as GET /", async () => {
    const routes = await router_buildRoutes(".");
    expect(routes["/"]).toBeDefined();
    expect(routes["/"]!["GET"]).toBeDefined();
  });

  test("discovers form_chat_POST.tsx as POST /chat", async () => {
    const routes = await router_buildRoutes(".");
    expect(routes["/chat"]).toBeDefined();
    expect(routes["/chat"]!["POST"]).toBeDefined();
  });

  test("discovers form_reset_POST.tsx as POST /reset", async () => {
    const routes = await router_buildRoutes(".");
    expect(routes["/reset"]).toBeDefined();
    expect(routes["/reset"]!["POST"]).toBeDefined();
  });

  test("discovers form_abort_POST.tsx as POST /abort", async () => {
    const routes = await router_buildRoutes(".");
    expect(routes["/abort"]).toBeDefined();
    expect(routes["/abort"]!["POST"]).toBeDefined();
  });

  test("GET / returns HTML response", async () => {
    const routes = await router_buildRoutes(".");
    const handler = routes["/"]!["GET"] as (req: Request) => Promise<Response>;
    const res = await handler(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Hyper Code");
    expect(html).toContain('data-page="chat"');
  });
});

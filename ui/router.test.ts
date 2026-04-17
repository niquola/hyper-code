import { test, expect, describe } from "bun:test";
import router_buildRoutes from "./router_buildRoutes.ts";

const mockCtx = {} as any;

describe("router_buildRoutes", () => {
  test("discovers page_index.tsx as GET /", async () => {
    const routes = await router_buildRoutes("./ui", mockCtx);
    expect(routes["/"]).toBeDefined();
    expect(routes["/"]!["GET"]).toBeDefined();
  });

  test("discovers page_session_new as GET /session/new", async () => {
    const routes = await router_buildRoutes("./ui", mockCtx);
    expect(routes["/session/new"]).toBeDefined();
    expect(routes["/session/new"]!["GET"]).toBeDefined();
  });

  test("discovers form_session_create as POST /session/create", async () => {
    const routes = await router_buildRoutes("./ui", mockCtx);
    expect(routes["/session/create"]).toBeDefined();
    expect(routes["/session/create"]!["POST"]).toBeDefined();
  });

  test("discovers frag_sessions as GET /sessions", async () => {
    const routes = await router_buildRoutes("./ui", mockCtx);
    expect(routes["/sessions"]).toBeDefined();
    expect(routes["/sessions"]!["GET"]).toBeDefined();
  });
});

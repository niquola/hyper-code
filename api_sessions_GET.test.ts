import { describe, test, expect, beforeEach } from "bun:test";
import api_sessions_GET from "./api_sessions_GET.ts";
import { chat_db } from "./chat_db.ts";
import type { Ctx } from "./agent_type_Ctx.ts";

function createTestCtx(): Ctx {
  return {
    db: chat_db(":memory:"),
    cwd: "/tmp/test",
    model: { provider: "test", modelId: "test", name: "Test", contextWindow: 1000, maxOutputTokens: 1000 },
    apiKey: "test-key",
    systemPrompt: "test",
    tools: [],
  };
}

describe("api_sessions_GET", () => {
  let ctx: Ctx;

  beforeEach(() => {
    ctx = createTestCtx();
  });

  test("returns empty sessions array when no sessions", async () => {
    const res = await api_sessions_GET(ctx, new Request("http://localhost/api/sessions"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sessions).toEqual([]);
  });

  test("returns sessions in tree order", async () => {
    const parent = ctx.db.createSession({ title: "Parent" });
    const child = ctx.db.createSession({ title: "Child", parent });

    const res = await api_sessions_GET(ctx, new Request("http://localhost/api/sessions"));
    const data = await res.json();

    expect(data.sessions).toHaveLength(2);
    expect(data.sessions[0]).toMatchObject({ id: parent, title: "Parent", depth: 0 });
    expect(data.sessions[1]).toMatchObject({ id: child, title: "Child", depth: 1, parent });
  });
});

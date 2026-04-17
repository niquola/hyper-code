import { test, expect, mock } from "bun:test";

// We mock auth_codex.ts before importing the handler so that
// form_login_codex_POST.tsx receives the mocked implementation.

test("Codex login form redirects to auth URL", async () => {
  mock.module("./auth_codex.ts", () => ({
    auth_codexLogin: async (port?: number) => {
      // return fake OAuth flow with deterministic URL
      return {
        authUrl: "https://example.test/openai-codex-auth",
        waitForCredentials: async () => ({
          access: "access-token",
          refresh: "refresh-token",
          expires: Date.now() + 3600_000,
          accountId: "acc-123",
        }),
      };
    },
  }));

  const { default: handler } = await import("./form_login_codex_POST.tsx");

  const req = new Request("http://localhost/settings/codex", { method: "POST" });
  const ctx = {} as any;

  const res = await handler(ctx, req);
  expect(res).toBeInstanceOf(Response);
  expect(res!.status).toBe(302);
  expect(res!.headers.get("Location")).toBe("https://example.test/openai-codex-auth");
});

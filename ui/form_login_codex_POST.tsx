import type { Ctx } from "../agent/type_Ctx.ts";

export default async function (ctx: Ctx, req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const orgId = form?.get("org") as string | null;
    const port = Number(await Bun.file(".port").text().catch(() => "3000"));
    const { authUrl, waitForCredentials } = await ctx.auth.codexLogin(port, orgId || undefined);

    // Wait for OAuth callback in background, save credentials when done
    waitForCredentials()
      .then(async (creds) => {
        const settings = await ctx.chat.loadSettings();
        settings.provider = "openai-codex";
        settings.modelId = settings.modelId.startsWith("gpt-5") ? settings.modelId : "gpt-5.2-codex";
        settings.apiKey = ""; // Keys stored per-provider now
        await ctx.chat.saveSettings(settings);
        await ctx.chat.saveApiKey(ctx.home, "openai-codex", creds.access);
        ctx.chat.resetSessions(ctx);
        
        console.log("[codex] Login successful, account:", creds.accountId);
      })
      .catch((err) => console.error("[codex] Login failed:", err));

    // Redirect to OpenAI auth page
    return new Response(null, {
      status: 302,
      headers: { Location: authUrl },
    });
  } catch (err: any) {
    console.error("[codex] Login handler failed:", err);
    return new Response("Codex login failed", { status: 500 });
  }
}

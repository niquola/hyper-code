import type { Ctx } from "../agent/type_Ctx.ts";
import { auth_codexLogin } from "../auth/codex.ts";
import { chat_loadSettings, chat_saveSettings } from "../chat/settings.ts";
import { chat_resetSessions } from "../chat/start.ts";
import { chat_saveApiKey } from "../chat/apiKeys.ts";

export default async function (ctx: Ctx, req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const orgId = form?.get("org") as string | null;
    const port = Number(await Bun.file(".port").text().catch(() => "3000"));
    const { authUrl, waitForCredentials } = await auth_codexLogin(port, orgId || undefined);

    // Wait for OAuth callback in background, save credentials when done
    waitForCredentials()
      .then(async (creds) => {
        const settings = await chat_loadSettings();
        settings.provider = "openai-codex";
        settings.modelId = settings.modelId.startsWith("gpt-5") ? settings.modelId : "gpt-5.2-codex";
        settings.apiKey = ""; // Keys stored per-provider now
        await chat_saveSettings(settings);
        await chat_saveApiKey(ctx.home, "openai-codex", creds.access);
        chat_resetSessions();
        
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

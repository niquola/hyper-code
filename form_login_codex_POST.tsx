import { auth_codexLogin } from "./auth_codex.ts";
import { chat_loadSettings, chat_saveSettings } from "./chat_settings.ts";
import { chat_resetCtx } from "./chat_ctx.ts";

export default async function (req: Request) {
  try {
    const { authUrl, waitForCredentials } = await auth_codexLogin();

    // Wait for OAuth callback in background, save credentials when done
    waitForCredentials().then(async (creds) => {
      const settings = await chat_loadSettings();
      settings.provider = "openai-codex";
      settings.modelId = settings.modelId.startsWith("gpt-5") ? settings.modelId : "gpt-5.2-codex";
      settings.apiKey = creds.access;
      settings.refreshToken = creds.refresh;
      settings.tokenExpires = creds.expires;
      settings.accountId = creds.accountId;
      await chat_saveSettings(settings);
      chat_resetCtx();
      console.log("[codex] Login successful, account:", creds.accountId);
    }).catch((err) => console.error("[codex] Login failed:", err));

    // Redirect to OpenAI auth page
    return new Response(null, { status: 302, headers: { Location: authUrl } });
  } catch (err: any) {
    return new Response(`Login failed: ${err.message}`, { status: 500 });
  }
}

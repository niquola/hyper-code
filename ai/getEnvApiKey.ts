import type { Env } from "../agent/type_Ctx.ts";

const ENV_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  "azure-openai-responses": "AZURE_OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  xai: "XAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  "vercel-ai-gateway": "AI_GATEWAY_API_KEY",
  zai: "ZAI_API_KEY",
  mistral: "MISTRAL_API_KEY",
  minimax: "MINIMAX_API_KEY",
  "minimax-cn": "MINIMAX_CN_API_KEY",
  huggingface: "HF_TOKEN",
  opencode: "OPENCODE_API_KEY",
  "opencode-go": "OPENCODE_API_KEY",
  "kimi-coding": "KIMI_API_KEY",
  "github-copilot": "GITHUB_TOKEN",
};

export default function ai_getEnvApiKey(home: string, provider: string, env?: Env): string | undefined {
  const e = env ?? (process.env as Env);

  // Anthropic: OAuth token takes precedence
  if (provider === "anthropic") {
    return e.ANTHROPIC_OAUTH_TOKEN || e.ANTHROPIC_API_KEY;
  }

  // GitHub Copilot: multiple env vars
  if (provider === "github-copilot") {
    return e.COPILOT_GITHUB_TOKEN || e.GH_TOKEN || e.GITHUB_TOKEN;
  }

  // Codex: read OAuth JWT from ~/.codex/auth.json
  if (provider === "openai-codex") {
    try {
      const auth = JSON.parse(require("node:fs").readFileSync(`${home}/.codex/auth.json`, "utf-8"));
      const token = auth.tokens?.access_token;
      if (token && token.split(".").length === 3) return token;
    } catch {}
    return undefined;
  }

  // Kimi: read from CLI credentials file
  if (provider === "kimi-coding") {
    if (e.KIMI_API_KEY) return e.KIMI_API_KEY;
    try {
      const creds = JSON.parse(require("node:fs").readFileSync(`${home}/.kimi/credentials/kimi-code.json`, "utf-8"));
      if (creds.access_token && creds.expires_at > Date.now() / 1000) return creds.access_token;
    } catch {}
    return undefined;
  }

  const envVar = ENV_MAP[provider];
  return envVar ? e[envVar] : undefined;
}

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

export function ai_getEnvApiKey(provider: string): string | undefined {
  // Anthropic: OAuth token takes precedence
  if (provider === "anthropic") {
    return process.env.ANTHROPIC_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
  }

  // GitHub Copilot: multiple env vars
  if (provider === "github-copilot") {
    return process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  }

  // Kimi: read from CLI credentials file
  if (provider === "kimi-coding") {
    if (process.env.KIMI_API_KEY) return process.env.KIMI_API_KEY;
    try {
      const home = process.env.HOME || process.env.USERPROFILE || "";
      const creds = JSON.parse(require("node:fs").readFileSync(`${home}/.kimi/credentials/kimi-code.json`, "utf-8"));
      if (creds.access_token && creds.expires_at > Date.now() / 1000) return creds.access_token;
    } catch {}
    return undefined;
  }

  const envVar = ENV_MAP[provider];
  return envVar ? process.env[envVar] : undefined;
}

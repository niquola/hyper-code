const ENV_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  groq: "GROQ_API_KEY",
  xai: "XAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
};

export function ai_getEnvApiKey(provider: string): string | undefined {
  const envVar = ENV_MAP[provider];
  return envVar ? process.env[envVar] : undefined;
}

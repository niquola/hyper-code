export type StreamOptions = {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  apiKey?: string;
  headers?: Record<string, string>;
  reasoningEffort?: "low" | "medium" | "high";
  sessionId?: string; // For prompt caching (Codex prompt_cache_key)
  home?: string; // Home dir for credential files (~/.codex/auth.json etc.)
};

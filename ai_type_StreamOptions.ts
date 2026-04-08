export type StreamOptions = {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  apiKey?: string;
  headers?: Record<string, string>;
  reasoningEffort?: "low" | "medium" | "high";
};

export type ChatSettings = {
  provider: string;
  modelId: string;
  apiKey: string;
  // OAuth fields (for Codex etc.)
  refreshToken?: string;
  tokenExpires?: number;
  accountId?: string;
};

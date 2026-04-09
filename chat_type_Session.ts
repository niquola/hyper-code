import type { Message } from "./ai_type_Message.ts";

export type Session = {
  filename: string;
  messages: Message[];
  steerQueue: string[];
  followUpQueue: string[];
  abortController: AbortController | null;
  isStreaming: boolean;
};

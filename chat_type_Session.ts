import type { Message } from "./ai_type_Message.ts";

export type SSEListener = (html: string) => void;
export type DialogResolver = (response: string) => void;

export type Session = {
  filename: string;
  messages: Message[];
  steerQueue: string[];
  followUpQueue: string[];
  abortController: AbortController | null;
  isStreaming: boolean;
  sseListeners: Set<SSEListener>;
  pendingDialogs: Map<string, DialogResolver>;
  emitHtml?: (html: string) => void;
};

import type { Message } from "./ai_type_Message.ts";
import type { Model } from "./ai_type_Model.ts";

export type SSEListener = (html: string) => void;
export type DialogResolver = (response: string) => void;

export type Session = {
  session_id: string;
  messages: Message[];
  model: Model;
  apiKey: string;
  systemPrompt: string;
  steerQueue: string[];
  followUpQueue: string[];
  abortController: AbortController | null;
  isStreaming: boolean;
  sseListeners: Set<SSEListener>;
  pendingDialogs: Map<string, DialogResolver>;
  emitHtml?: (html: string) => void;
};

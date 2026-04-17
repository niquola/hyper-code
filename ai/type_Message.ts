export type TextContent = {
  type: "text";
  text: string;
};

export type HtmlContent = {
  type: "html";
  html: string;
};

export type ThinkingContent = {
  type: "thinking";
  thinking: string;
  thinkingSignature?: string;
  redacted?: boolean;
};

export type ImageContent = {
  type: "image";
  data: string;
  mimeType: string;
};

export type ToolCall = {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, any>;
};

export type Usage = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
};

export type StopReason = "stop" | "length" | "toolUse" | "error" | "aborted";

export type UserMessage = {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;
};

export type AssistantMessage = {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  provider: string;
  model: string;
  responseId?: string;
  usage: Usage;
  stopReason: StopReason;
  errorMessage?: string;
  timestamp: number;
};

export type ToolResultMessage = {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent | HtmlContent)[];
  isError: boolean;
  timestamp: number;
};

export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export type Tool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type Context = {
  systemPrompt?: string;
  messages: Message[];
  tools?: Tool[];
};

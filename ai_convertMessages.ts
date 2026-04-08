import type OpenAI from "openai";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions.js";
import type { Context, Message, TextContent, ThinkingContent, ToolCall, ToolResultMessage } from "./ai_type_Message.ts";
import type { Model } from "./ai_type_Model.ts";
import { ai_sanitizeSurrogates } from "./ai_sanitizeSurrogates.ts";
import { ai_transformMessages } from "./ai_transformMessages.ts";

export function ai_convertMessages(model: Model, context: Context): ChatCompletionMessageParam[] {
  const params: ChatCompletionMessageParam[] = [];
  const transformed = ai_transformMessages(context.messages);

  if (context.systemPrompt) {
    const role = model.reasoning ? "developer" : "system";
    params.push({ role: role as any, content: ai_sanitizeSurrogates(context.systemPrompt) });
  }

  for (let i = 0; i < transformed.length; i++) {
    const msg = transformed[i]!;

    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        params.push({ role: "user", content: ai_sanitizeSurrogates(msg.content) });
      } else {
        const content: ChatCompletionContentPart[] = msg.content.map((item) => {
          if (item.type === "text") {
            return { type: "text" as const, text: ai_sanitizeSurrogates(item.text) };
          }
          return {
            type: "image_url" as const,
            image_url: { url: `data:${item.mimeType};base64,${item.data}` },
          };
        });
        const filtered = !model.input.includes("image")
          ? content.filter((c) => c.type !== "image_url")
          : content;
        if (filtered.length === 0) continue;
        params.push({ role: "user", content: filtered });
      }
    } else if (msg.role === "assistant") {
      const assistantMsg: ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: null,
      };

      const textBlocks = msg.content.filter((b) => b.type === "text") as TextContent[];
      const nonEmpty = textBlocks.filter((b) => b.text && b.text.trim().length > 0);
      if (nonEmpty.length > 0) {
        assistantMsg.content = nonEmpty.map((b) => ai_sanitizeSurrogates(b.text)).join("");
      }

      const toolCalls = msg.content.filter((b) => b.type === "toolCall") as ToolCall[];
      if (toolCalls.length > 0) {
        assistantMsg.tool_calls = toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        }));
      }

      const content = assistantMsg.content;
      const hasContent = content !== null && content !== undefined &&
        (typeof content === "string" ? content.length > 0 : (content as any[]).length > 0);
      if (!hasContent && !assistantMsg.tool_calls) continue;
      params.push(assistantMsg);
    } else if (msg.role === "toolResult") {
      for (; i < transformed.length && transformed[i]!.role === "toolResult"; i++) {
        const toolMsg = transformed[i] as ToolResultMessage;
        const textResult = toolMsg.content
          .map((c) => {
            if (c.type === "text") return (c as TextContent).text;
            if (c.type === "html") return "[HTML widget rendered in UI]";
            return "[image]";
          })
          .join("\n");

        const toolResultMsg: ChatCompletionToolMessageParam = {
          role: "tool",
          content: ai_sanitizeSurrogates(textResult || "(empty)"),
          tool_call_id: toolMsg.toolCallId,
        };
        params.push(toolResultMsg);
      }
      i--;
    }
  }

  return params;
}

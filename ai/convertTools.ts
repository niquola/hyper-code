import type OpenAI from "openai";
import type { Tool } from "../ai_type_Message.ts";

export function ai_convertTools(tools: Tool[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as any,
      strict: false,
    },
  }));
}

import OpenAI from "openai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions.js";
import type { AssistantMessage, Context, StopReason, TextContent, ThinkingContent, ToolCall } from "../ai/type_Message.ts";
import type { Model } from "../ai/type_Model.ts";
import type { StreamOptions } from "../ai/type_StreamOptions.ts";
import { ai_stream_createAssistantMessageEventStream, type AssistantMessageEventStream } from "./EventStream.ts";
import { ai_convertMessages } from "./convertMessages.ts";
import { ai_convertTools } from "./convertTools.ts";
import { ai_getEnvApiKey } from "./getEnvApiKey.ts";
import { ai_calculateCost } from "./calculateCost.ts";
import { ai_parseStreamingJson } from "./parseStreamingJson.ts";
import { ai_streamResponses } from "./streamResponses.ts";
import { ai_streamCodex } from "./streamCodex.ts";
import { ai_streamAnthropic } from "./streamAnthropic.ts";

// Providers that use OpenAI Responses API instead of Completions
const RESPONSES_API_PROVIDERS = new Set(["openai", "azure-openai-responses", "github-copilot"]);
// Providers that use Anthropic Messages API
const ANTHROPIC_API_PROVIDERS = new Set(["anthropic", "kimi-coding"]);

export function ai_stream(model: Model, context: Context, options?: StreamOptions): AssistantMessageEventStream {
  // Route Codex to dedicated codex stream (raw fetch, custom headers)
  if (model.provider === "openai-codex") {
    return ai_streamCodex(model, context, options);
  }

  // Route Anthropic Messages API providers (Anthropic, Kimi)
  if (ANTHROPIC_API_PROVIDERS.has(model.provider)) {
    return ai_streamAnthropic(model, context, options);
  }

  // Route to Responses API for providers that use it
  if (RESPONSES_API_PROVIDERS.has(model.provider)) {
    return ai_streamResponses(model, context, options);
  }

  // Default: OpenAI Completions API (works with LM Studio, Groq, OpenRouter, etc.)
  const stream = ai_stream_createAssistantMessageEventStream();

  (async () => {
    const output: AssistantMessage = {
      role: "assistant",
      content: [],
      provider: model.provider,
      model: model.id,
      usage: {
        input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "stop",
      timestamp: Date.now(),
    };

    try {
      const apiKey = options?.apiKey || ai_getEnvApiKey(options?.home || "/tmp", model.provider);
      if (!apiKey) throw new Error(`No API key for provider: ${model.provider}. Set ${model.provider.toUpperCase().replace(/-/g, "_")}_API_KEY`);

      const client = new OpenAI({
        apiKey,
        baseURL: model.baseUrl,
        dangerouslyAllowBrowser: true,
        defaultHeaders: { ...model.headers, ...options?.headers },
      });

      const messages = ai_convertMessages(model, context);
      const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
        model: model.id,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        store: false,
      };

      if (options?.maxTokens) {
        params.max_completion_tokens = options.maxTokens;
      } else {
        params.max_completion_tokens = Math.min(model.maxTokens, 32_000);
      }

      if (options?.temperature !== undefined) {
        params.temperature = options.temperature;
      }

      if (context.tools && context.tools.length > 0) {
        params.tools = ai_convertTools(context.tools);
      }

      if (options?.reasoningEffort && model.reasoning) {
        (params as any).reasoning_effort = options.reasoningEffort;
      }

      const openaiStream = await client.chat.completions.create(params, { signal: options?.signal });
      stream.push({ type: "start", partial: output });

      let currentBlock: TextContent | ThinkingContent | (ToolCall & { partialArgs?: string }) | null = null;
      const blocks = output.content;
      const blockIndex = () => blocks.length - 1;

      const finishCurrentBlock = (block?: typeof currentBlock) => {
        if (!block) return;
        if (block.type === "text") {
          stream.push({ type: "text_end", contentIndex: blockIndex(), content: block.text, partial: output });
        } else if (block.type === "thinking") {
          stream.push({ type: "thinking_end", contentIndex: blockIndex(), content: block.thinking, partial: output });
        } else if (block.type === "toolCall") {
          block.arguments = ai_parseStreamingJson(block.partialArgs);
          delete block.partialArgs;
          stream.push({ type: "toolcall_end", contentIndex: blockIndex(), toolCall: block, partial: output });
        }
      };

      for await (const chunk of openaiStream) {
        if (!chunk || typeof chunk !== "object") continue;

        output.responseId ||= chunk.id;
        if (chunk.usage) {
          output.usage = parseChunkUsage(chunk.usage, model);
        }

        const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : undefined;
        if (!choice) continue;

        if (choice.finish_reason) {
          output.stopReason = mapStopReason(choice.finish_reason);
        }

        if (choice.delta) {
          // Text content
          if (choice.delta.content != null && choice.delta.content.length > 0) {
            if (!currentBlock || currentBlock.type !== "text") {
              finishCurrentBlock(currentBlock);
              currentBlock = { type: "text", text: "" };
              output.content.push(currentBlock);
              stream.push({ type: "text_start", contentIndex: blockIndex(), partial: output });
            }
            if (currentBlock.type === "text") {
              currentBlock.text += choice.delta.content;
              stream.push({ type: "text_delta", contentIndex: blockIndex(), delta: choice.delta.content, partial: output });
            }
          }

          // Reasoning/thinking content
          const reasoning = (choice.delta as any).reasoning_content ?? (choice.delta as any).reasoning;
          if (reasoning != null && reasoning.length > 0) {
            if (!currentBlock || currentBlock.type !== "thinking") {
              finishCurrentBlock(currentBlock);
              currentBlock = { type: "thinking", thinking: "" };
              output.content.push(currentBlock);
              stream.push({ type: "thinking_start", contentIndex: blockIndex(), partial: output });
            }
            if (currentBlock.type === "thinking") {
              currentBlock.thinking += reasoning;
              stream.push({ type: "thinking_delta", contentIndex: blockIndex(), delta: reasoning, partial: output });
            }
          }

          // Tool calls
          if (choice.delta.tool_calls) {
            for (const toolCall of choice.delta.tool_calls) {
              if (!currentBlock || currentBlock.type !== "toolCall" || (toolCall.id && currentBlock.id !== toolCall.id)) {
                finishCurrentBlock(currentBlock);
                currentBlock = { type: "toolCall", id: toolCall.id || "", name: toolCall.function?.name || "", arguments: {}, partialArgs: "" };
                output.content.push(currentBlock);
                stream.push({ type: "toolcall_start", contentIndex: blockIndex(), partial: output });
              }
              if (currentBlock.type === "toolCall") {
                if (toolCall.id) currentBlock.id = toolCall.id;
                if (toolCall.function?.name) currentBlock.name = toolCall.function.name;
                let delta = "";
                if (toolCall.function?.arguments) {
                  delta = toolCall.function.arguments;
                  currentBlock.partialArgs += toolCall.function.arguments;
                  currentBlock.arguments = ai_parseStreamingJson(currentBlock.partialArgs);
                }
                stream.push({ type: "toolcall_delta", contentIndex: blockIndex(), delta, partial: output });
              }
            }
          }
        }
      }

      finishCurrentBlock(currentBlock);

      if (options?.signal?.aborted) throw new Error("Request was aborted");
      if (output.stopReason === "error") throw new Error(output.errorMessage || "Provider returned an error");

      stream.push({ type: "done", reason: output.stopReason as "stop" | "length" | "toolUse", message: output });
      stream.end();
    } catch (error) {
      output.stopReason = options?.signal?.aborted ? "aborted" : "error";
      output.errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      stream.push({ type: "error", reason: output.stopReason, error: output });
      stream.end();
    }
  })();

  return stream;
}

function parseChunkUsage(
  rawUsage: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number }; completion_tokens_details?: { reasoning_tokens?: number } },
  model: Model,
): AssistantMessage["usage"] {
  const promptTokens = rawUsage.prompt_tokens || 0;
  const cacheReadTokens = rawUsage.prompt_tokens_details?.cached_tokens || 0;
  const reasoningTokens = rawUsage.completion_tokens_details?.reasoning_tokens || 0;
  const input = Math.max(0, promptTokens - cacheReadTokens);
  const outputTokens = (rawUsage.completion_tokens || 0) + reasoningTokens;
  const usage: AssistantMessage["usage"] = {
    input,
    output: outputTokens,
    cacheRead: cacheReadTokens,
    cacheWrite: 0,
    totalTokens: input + outputTokens + cacheReadTokens,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
  ai_calculateCost(model, usage);
  return usage;
}

function mapStopReason(reason: ChatCompletionChunk.Choice["finish_reason"] | string): StopReason {
  switch (reason) {
    case "stop": case "end": return "stop";
    case "length": return "length";
    case "function_call": case "tool_calls": return "toolUse";
    default: return "error";
  }
}

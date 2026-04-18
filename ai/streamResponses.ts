import OpenAI from "openai";
import type {
  ResponseCreateParamsStreaming,
  ResponseInput,
  ResponseInputContent,
  ResponseStreamEvent,
} from "openai/resources/responses/responses.js";
import type { AssistantMessage, Context, StopReason, TextContent, ThinkingContent, ToolCall, Tool } from "../ai/type_Message.ts";
import type { Model } from "../ai/type_Model.ts";
import type { StreamOptions } from "../ai/type_StreamOptions.ts";

export default function ai_streamResponses(ctx: any, model: Model, context: Context, options?: StreamOptions): AssistantMessageEventStream {
  const stream = ctx.ai.EventStream();

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
      const apiKey = options?.apiKey || ctx.ai.getEnvApiKey(options?.home || "/tmp", model.provider);
      if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);

      const client = new OpenAI({
        apiKey,
        baseURL: model.baseUrl,
        dangerouslyAllowBrowser: true,
        defaultHeaders: { ...model.headers, ...options?.headers },
      });

      const input = convertMessages(ctx, model, context);
      const params: ResponseCreateParamsStreaming = {
        model: model.id,
        input,
        stream: true,
        store: false,
      };

      if (options?.maxTokens) {
        params.max_output_tokens = options.maxTokens;
      } else {
        params.max_output_tokens = Math.min(model.maxTokens, 32_000);
      }

      if (options?.temperature !== undefined) {
        params.temperature = options.temperature;
      }

      if (context.tools && context.tools.length > 0) {
        params.tools = context.tools.map((t) => ({
          type: "function" as const,
          name: t.name,
          description: t.description,
          parameters: t.parameters as any,
          strict: false,
        }));
      }

      if (model.reasoning && options?.reasoningEffort) {
        params.reasoning = { effort: options.reasoningEffort, summary: "auto" };
        params.include = ["reasoning.encrypted_content"];
      } else if (model.reasoning) {
        params.reasoning = { effort: "medium", summary: "auto" };
        params.include = ["reasoning.encrypted_content"];
      }

      const openaiStream = await client.responses.create(params, options?.signal ? { signal: options.signal } : undefined);
      stream.push({ type: "start", partial: output });

      // Process stream events
      let currentBlock: ThinkingContent | TextContent | (ToolCall & { partialJson: string }) | null = null;
      const blocks = output.content;
      const blockIndex = () => blocks.length - 1;

      for await (const event of openaiStream as AsyncIterable<ResponseStreamEvent>) {
        if (event.type === "response.created") {
          output.responseId = event.response.id;
        } else if (event.type === "response.output_item.added") {
          const item = event.item;
          if (item.type === "reasoning") {
            currentBlock = { type: "thinking", thinking: "" };
            output.content.push(currentBlock);
            stream.push({ type: "thinking_start", contentIndex: blockIndex(), partial: output });
          } else if (item.type === "message") {
            currentBlock = { type: "text", text: "" };
            output.content.push(currentBlock);
            stream.push({ type: "text_start", contentIndex: blockIndex(), partial: output });
          } else if (item.type === "function_call") {
            currentBlock = {
              type: "toolCall", id: `${item.call_id}|${item.id}`,
              name: item.name, arguments: {}, partialJson: item.arguments || "",
            };
            output.content.push(currentBlock);
            stream.push({ type: "toolcall_start", contentIndex: blockIndex(), partial: output });
          }
        } else if (event.type === "response.reasoning_summary_text.delta") {
          if (currentBlock?.type === "thinking") {
            currentBlock.thinking += event.delta;
            stream.push({ type: "thinking_delta", contentIndex: blockIndex(), delta: event.delta, partial: output });
          }
        } else if (event.type === "response.output_text.delta") {
          if (currentBlock?.type === "text") {
            currentBlock.text += event.delta;
            stream.push({ type: "text_delta", contentIndex: blockIndex(), delta: event.delta, partial: output });
          }
        } else if (event.type === "response.refusal.delta") {
          if (currentBlock?.type === "text") {
            currentBlock.text += event.delta;
            stream.push({ type: "text_delta", contentIndex: blockIndex(), delta: event.delta, partial: output });
          }
        } else if (event.type === "response.function_call_arguments.delta") {
          if (currentBlock?.type === "toolCall") {
            currentBlock.partialJson += event.delta;
            currentBlock.arguments = ctx.ai.parseStreamingJson(currentBlock.partialJson);
            stream.push({ type: "toolcall_delta", contentIndex: blockIndex(), delta: event.delta, partial: output });
          }
        } else if (event.type === "response.output_item.done") {
          const item = event.item;
          if (item.type === "reasoning" && currentBlock?.type === "thinking") {
            currentBlock.thinking = item.summary?.map((s: any) => s.text).join("\n\n") || currentBlock.thinking;
            currentBlock.thinkingSignature = JSON.stringify(item);
            stream.push({ type: "thinking_end", contentIndex: blockIndex(), content: currentBlock.thinking, partial: output });
            currentBlock = null;
          } else if (item.type === "message" && currentBlock?.type === "text") {
            currentBlock.text = item.content.map((c: any) => c.type === "output_text" ? c.text : c.refusal).join("");
            stream.push({ type: "text_end", contentIndex: blockIndex(), content: currentBlock.text, partial: output });
            currentBlock = null;
          } else if (item.type === "function_call") {
            const args = currentBlock?.type === "toolCall" && currentBlock.partialJson
              ? ctx.ai.parseStreamingJson(currentBlock.partialJson)
              : ctx.ai.parseStreamingJson(item.arguments || "{}");
            const toolCall: ToolCall = {
              type: "toolCall", id: `${item.call_id}|${item.id}`,
              name: item.name, arguments: args,
            };
            currentBlock = null;
            stream.push({ type: "toolcall_end", contentIndex: blockIndex(), toolCall, partial: output });
          }
        } else if (event.type === "response.completed") {
          const response = event.response;
          output.responseId = response?.id || output.responseId;
          if (response?.usage) {
            const cachedTokens = (response.usage as any).input_tokens_details?.cached_tokens || 0;
            output.usage = {
              input: (response.usage.input_tokens || 0) - cachedTokens,
              output: response.usage.output_tokens || 0,
              cacheRead: cachedTokens, cacheWrite: 0,
              totalTokens: response.usage.total_tokens || 0,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            };
            ctx.ai.calculateCost(model, output.usage);
          }
          output.stopReason = mapStopReason(response?.status);
          if (output.content.some((b) => b.type === "toolCall") && output.stopReason === "stop") {
            output.stopReason = "toolUse";
          }
        } else if (event.type === "error") {
          throw new Error(`${(event as any).code}: ${(event as any).message}` || "Unknown error");
        } else if (event.type === "response.failed") {
          const error = (event as any).response?.error;
          throw new Error(error ? `${error.code}: ${error.message}` : "Unknown error");
        }
      }

      if (options?.signal?.aborted) throw new Error("Request was aborted");
      if (output.stopReason === "error") throw new Error(output.errorMessage || "Provider error");

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

function convertMessages(ctx: any, model: Model, context: Context): ResponseInput {
  const messages: ResponseInput = [];
  const transformed = ctx.ai.transformMessages(context.messages);

  if (context.systemPrompt) {
    const role = model.reasoning ? "developer" : "system";
    messages.push({ role: role as any, content: ctx.ai.sanitizeSurrogates(context.systemPrompt) });
  }

  for (const msg of transformed) {
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        messages.push({ role: "user", content: [{ type: "input_text", text: ctx.ai.sanitizeSurrogates(msg.content) }] });
      } else {
        const content: ResponseInputContent[] = msg.content.map((item) => {
          if (item.type === "text") return { type: "input_text" as const, text: ctx.ai.sanitizeSurrogates(item.text) };
          return { type: "input_image" as const, detail: "auto" as const, image_url: `data:${item.mimeType};base64,${item.data}` };
        });
        const filtered = !model.input.includes("image") ? content.filter((c) => c.type !== "input_image") : content;
        if (filtered.length === 0) continue;
        messages.push({ role: "user", content: filtered });
      }
    } else if (msg.role === "assistant") {
      for (const block of msg.content) {
        if (block.type === "thinking" && block.thinkingSignature) {
          try { messages.push(JSON.parse(block.thinkingSignature)); } catch {}
        } else if (block.type === "text") {
          messages.push({
            type: "message", role: "assistant",
            content: [{ type: "output_text", text: ctx.ai.sanitizeSurrogates(block.text), annotations: [] }],
            status: "completed", id: `msg_${ctx.ai.shortHash(block.text)}`,
          } as any);
        } else if (block.type === "toolCall") {
          const [callId, itemId] = block.id.split("|");
          messages.push({
            type: "function_call", id: itemId, call_id: callId,
            name: block.name, arguments: JSON.stringify(block.arguments),
          } as any);
        }
      }
    } else if (msg.role === "toolResult") {
      const textResult = msg.content.filter((c) => c.type === "text").map((c) => (c as TextContent).text).join("\n");
      const [callId] = msg.toolCallId.split("|");
      messages.push({ type: "function_call_output", call_id: callId!, output: ctx.ai.sanitizeSurrogates(textResult || "(empty)") } as any);
    }
  }

  return messages;
}

function mapStopReason(status: string | undefined): StopReason {
  switch (status) {
    case "completed": return "stop";
    case "incomplete": return "length";
    case "failed": case "cancelled": return "error";
    default: return "stop";
  }
}

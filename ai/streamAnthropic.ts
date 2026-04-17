// Anthropic Messages API streaming — used for Kimi, Anthropic, and compatible providers
import Anthropic from "@anthropic-ai/sdk";
import type { AssistantMessage, Context, StopReason, TextContent, ThinkingContent, ToolCall, Tool } from "../ai/type_Message.ts";
import type { Model } from "../ai/type_Model.ts";
import type { StreamOptions } from "../ai/type_StreamOptions.ts";

export default function ai_streamAnthropic(ctx: any, model: Model, context: Context, options?: StreamOptions): AssistantMessageEventStream {
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

      const client = new Anthropic({
        apiKey,
        baseURL: model.baseUrl || undefined,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          accept: "application/json",
          ...model.headers,
          ...options?.headers,
        },
      });

      // Build params
      const messages = convertMessages(context);
      const params: any = {
        model: model.id,
        messages,
        max_tokens: options?.maxTokens || Math.min(model.maxTokens, 32_000),
        stream: true,
      };

      if (context.systemPrompt) {
        params.system = [{ type: "text", text: ctx.ai.sanitizeSurrogates(context.systemPrompt), cache_control: { type: "ephemeral" } }];
      }

      if (context.tools && context.tools.length > 0) {
        params.tools = context.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: {
            type: "object",
            properties: (t.parameters as any).properties || {},
            required: (t.parameters as any).required || [],
          },
        }));
      }

      if (model.reasoning && options?.reasoningEffort) {
        params.thinking = { type: "enabled", budget_tokens: effortToBudget(options.reasoningEffort) };
      }

      // Stream
      const anthropicStream = client.messages.stream(params, options?.signal ? { signal: options.signal } : undefined);

      type Block = (ThinkingContent | TextContent | (ToolCall & { partialJson: string })) & { index: number };
      const blocks = output.content as Block[];

      stream.push({ type: "start", partial: output });

      for await (const event of anthropicStream) {
        if (event.type === "message_start") {
          const u = (event as any).message?.usage;
          if (u) {
            output.usage.input = u.input_tokens || 0;
            output.usage.output = u.output_tokens || 0;
            output.usage.cacheRead = u.cache_read_input_tokens || 0;
            output.usage.cacheWrite = u.cache_creation_input_tokens || 0;
            output.usage.totalTokens = output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
            ctx.ai.calculateCost(model, output.usage);
          }
          output.responseId = (event as any).message?.id;
        } else if (event.type === "content_block_start") {
          const cb = (event as any).content_block;
          if (cb.type === "text") {
            const block: Block = { type: "text", text: "", index: (event as any).index };
            blocks.push(block);
            stream.push({ type: "text_start", contentIndex: blocks.length - 1, partial: output });
          } else if (cb.type === "thinking") {
            const block: Block = { type: "thinking", thinking: "", thinkingSignature: "", index: (event as any).index };
            blocks.push(block);
            stream.push({ type: "thinking_start", contentIndex: blocks.length - 1, partial: output });
          } else if (cb.type === "tool_use") {
            const block: Block = {
              type: "toolCall", id: cb.id, name: cb.name,
              arguments: cb.input ?? {}, partialJson: "",
              index: (event as any).index,
            };
            blocks.push(block);
            stream.push({ type: "toolcall_start", contentIndex: blocks.length - 1, partial: output });
          }
        } else if (event.type === "content_block_delta") {
          const idx = blocks.findIndex((b) => b.index === (event as any).index);
          const block = blocks[idx];
          if (!block) continue;
          const delta = (event as any).delta;

          if (delta.type === "text_delta" && block.type === "text") {
            block.text += delta.text;
            stream.push({ type: "text_delta", contentIndex: idx, delta: delta.text, partial: output });
          } else if (delta.type === "thinking_delta" && block.type === "thinking") {
            block.thinking += delta.thinking;
            stream.push({ type: "thinking_delta", contentIndex: idx, delta: delta.thinking, partial: output });
          } else if (delta.type === "input_json_delta" && block.type === "toolCall") {
            block.partialJson += delta.partial_json;
            block.arguments = ctx.ai.parseStreamingJson(block.partialJson);
            stream.push({ type: "toolcall_delta", contentIndex: idx, delta: delta.partial_json, partial: output });
          } else if (delta.type === "signature_delta" && block.type === "thinking") {
            block.thinkingSignature = (block.thinkingSignature || "") + delta.signature;
          }
        } else if (event.type === "content_block_stop") {
          const idx = blocks.findIndex((b) => b.index === (event as any).index);
          const block = blocks[idx];
          if (!block) continue;
          delete (block as any).index;

          if (block.type === "text") {
            stream.push({ type: "text_end", contentIndex: idx, content: block.text, partial: output });
          } else if (block.type === "thinking") {
            stream.push({ type: "thinking_end", contentIndex: idx, content: block.thinking, partial: output });
          } else if (block.type === "toolCall") {
            block.arguments = ctx.ai.parseStreamingJson(block.partialJson);
            delete (block as any).partialJson;
            stream.push({ type: "toolcall_end", contentIndex: idx, toolCall: block, partial: output });
          }
        } else if (event.type === "message_delta") {
          const d = (event as any).delta;
          if (d?.stop_reason) output.stopReason = mapStopReason(d.stop_reason);
          const u = (event as any).usage;
          if (u) {
            if (u.output_tokens != null) output.usage.output = u.output_tokens;
            output.usage.totalTokens = output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
            ctx.ai.calculateCost(model, output.usage);
          }
        }
      }

      if (options?.signal?.aborted) throw new Error("Request was aborted");
      if (output.content.some((b) => b.type === "toolCall") && output.stopReason === "stop") {
        output.stopReason = "toolUse";
      }

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

// --- Message conversion ---

function convertMessages(context: Context): any[] {
  const messages: any[] = [];
  const transformed = ctx.ai.transformMessages(context.messages);

  for (const msg of transformed) {
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        messages.push({ role: "user", content: ctx.ai.sanitizeSurrogates(msg.content) });
      } else {
        const blocks = msg.content.map((item) => {
          if (item.type === "text") return { type: "text", text: ctx.ai.sanitizeSurrogates(item.text) };
          return { type: "image", source: { type: "base64", media_type: item.mimeType, data: item.data } };
        });
        messages.push({ role: "user", content: blocks });
      }
    } else if (msg.role === "assistant") {
      const blocks: any[] = [];
      for (const block of msg.content) {
        if (block.type === "text") {
          blocks.push({ type: "text", text: ctx.ai.sanitizeSurrogates(block.text) });
        } else if (block.type === "thinking") {
          if (block.thinkingSignature) {
            blocks.push({ type: "thinking", thinking: ctx.ai.sanitizeSurrogates(block.thinking), signature: block.thinkingSignature });
          } else {
            blocks.push({ type: "text", text: ctx.ai.sanitizeSurrogates(block.thinking) });
          }
        } else if (block.type === "toolCall") {
          blocks.push({ type: "tool_use", id: block.id, name: block.name, input: block.arguments ?? {} });
        }
      }
      if (blocks.length > 0) messages.push({ role: "assistant", content: blocks });
    } else if (msg.role === "toolResult") {
      const content = msg.content.map((c) => {
        if (c.type === "text") return { type: "text", text: ctx.ai.sanitizeSurrogates(c.text) };
        if (c.type === "image") return { type: "image", source: { type: "base64", media_type: c.mimeType, data: c.data } };
        return { type: "text", text: "[html widget]" };
      });
      messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: msg.toolCallId, content, is_error: msg.isError }] });
    }
  }

  // Add cache_control to last message for prompt caching
  if (messages.length > 0) {
    const last = messages[messages.length - 1];
    if (Array.isArray(last.content) && last.content.length > 0) {
      last.content[last.content.length - 1].cache_control = { type: "ephemeral" };
    } else if (typeof last.content === "string") {
      messages[messages.length - 1] = { ...last, content: [{ type: "text", text: last.content, cache_control: { type: "ephemeral" } }] };
    }
  }

  return messages;
}

function mapStopReason(reason: string): StopReason {
  switch (reason) {
    case "end_turn": return "stop";
    case "max_tokens": return "length";
    case "tool_use": return "toolUse";
    case "stop_sequence": return "stop";
    default: return "stop";
  }
}

function effortToBudget(effort: string): number {
  switch (effort) {
    case "none": case "minimal": return 1024;
    case "low": return 4096;
    case "medium": return 10240;
    case "high": return 32768;
    case "xhigh": return 65536;
    default: return 10240;
  }
}

import type { AssistantMessage, ToolCall, Tool } from "./ai_type_Message.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { AgentEvent } from "./agent_type_Event.ts";
import { ai_stream } from "./ai_stream.ts";
import { agent_executeTools } from "./agent_executeTools.ts";

export async function agent_run(
  ctx: Ctx,
  prompt: string,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  if (ctx.isStreaming) {
    // Already running — queue as follow-up
    ctx.followUpQueue.push(prompt);
    return;
  }

  ctx.isStreaming = true;
  ctx.abortController = new AbortController();

  // Add user message
  ctx.messages.push({ role: "user", content: prompt, timestamp: Date.now() });
  onEvent({ type: "agent_start" });

  try {
    // Agent loop: stream → tool calls → repeat
    while (true) {
      // Inject steer messages before each turn
      while (ctx.steerQueue.length > 0) {
        const steerMsg = ctx.steerQueue.shift()!;
        ctx.messages.push({ role: "user", content: `[STEER] ${steerMsg}`, timestamp: Date.now() });
        onEvent({ type: "steer", message: steerMsg });
      }

      onEvent({ type: "turn_start" });

      // Build tools for LLM context
      const llmTools: Tool[] = ctx.tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));

      const stream = ai_stream(
        ctx.model,
        {
          systemPrompt: ctx.systemPrompt,
          messages: ctx.messages,
          tools: llmTools.length > 0 ? llmTools : undefined,
        },
        {
          apiKey: ctx.apiKey,
          signal: ctx.abortController.signal,
        },
      );

      // Stream events
      let assistantMessage: AssistantMessage | null = null;

      for await (const event of stream) {
        if (event.type === "text_delta") {
          onEvent({ type: "text_delta", delta: event.delta });
        } else if (event.type === "thinking_delta") {
          onEvent({ type: "thinking_delta", delta: event.delta });
        } else if (event.type === "done") {
          assistantMessage = event.message;
        } else if (event.type === "error") {
          assistantMessage = event.error;
        }
      }

      if (!assistantMessage) {
        throw new Error("Stream ended without a final message");
      }

      // Add assistant message to context
      ctx.messages.push(assistantMessage);

      if (assistantMessage.stopReason === "error" || assistantMessage.stopReason === "aborted") {
        onEvent({ type: "error", error: assistantMessage.errorMessage || "Unknown error" });
        break;
      }

      onEvent({ type: "turn_end", message: assistantMessage });

      // Check for tool calls
      const toolCalls = assistantMessage.content.filter((b) => b.type === "toolCall") as ToolCall[];
      if (toolCalls.length === 0) break;

      // Execute tools and add results to messages
      const toolResults = await agent_executeTools(ctx, toolCalls, onEvent);
      ctx.messages.push(...toolResults);

      // Loop back for next LLM turn
    }

    onEvent({ type: "agent_end", messages: ctx.messages });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    onEvent({ type: "error", error: errorMsg });
  } finally {
    ctx.isStreaming = false;
    ctx.abortController = null;
  }

  // Process follow-up queue
  if (ctx.followUpQueue.length > 0) {
    const next = ctx.followUpQueue.shift()!;
    await agent_run(ctx, next, onEvent);
  }
}

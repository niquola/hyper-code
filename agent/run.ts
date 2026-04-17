import type { AssistantMessage, ToolCall, Tool } from "../ai_type_Message.ts";
import type { Ctx } from "../agent_type_Ctx.ts";
import type { Session } from "../chat_type_Session.ts";
import type { AgentEvent } from "../agent_type_Event.ts";
import { ai_stream } from "../ai_stream.ts";
import { agent_executeTools } from "./executeTools.ts";
import { chat_getApiKey } from "../chat_apiKeys.ts";

export async function agent_run(
  ctx: Ctx,
  session: Session,
  prompt: string,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  if (session.isStreaming) {
    // Already running — queue as follow-up
    session.followUpQueue.push(prompt);
    return;
  }

  session.isStreaming = true;
  session.abortController = new AbortController();

  // Add user message
  session.messages.push({ role: "user", content: prompt, timestamp: Date.now() });
  onEvent({ type: "agent_start" });

  try {
    // Agent loop: stream → tool calls → repeat
    while (true) {
      // Inject steer messages before each turn
      while (session.steerQueue.length > 0) {
        const steerMsg = session.steerQueue.shift()!;
        session.messages.push({ role: "user", content: `[STEER] ${steerMsg}`, timestamp: Date.now() });
        onEvent({ type: "steer", message: steerMsg });
      }

      onEvent({ type: "turn_start" });

      // Build tools for LLM context
      const llmTools: Tool[] = ctx.tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));

      // Resolve API key fresh each turn (picks up re-login tokens)
      const freshApiKey = await chat_getApiKey(ctx.home, session.model.provider) || session.apiKey;

      const stream = ai_stream(
        session.model,
        {
          systemPrompt: session.systemPrompt,
          messages: session.messages,
          tools: llmTools.length > 0 ? llmTools : undefined,
        },
        {
          apiKey: freshApiKey,
          sessionId: session.session_id,
          signal: session.abortController.signal,
          home: ctx.home,
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
      session.messages.push(assistantMessage);

      if (assistantMessage.stopReason === "error" || assistantMessage.stopReason === "aborted") {
        onEvent({ type: "error", error: assistantMessage.errorMessage || "Unknown error" });
        break;
      }

      onEvent({ type: "turn_end", message: assistantMessage });

      // Check for tool calls
      const toolCalls = assistantMessage.content.filter((b) => b.type === "toolCall") as ToolCall[];
      if (toolCalls.length === 0) break;

      // Execute tools and add results to messages
      const toolResults = await agent_executeTools(ctx, session, toolCalls, onEvent, session.abortController?.signal);
      session.messages.push(...toolResults);

      // Loop back for next LLM turn
    }

    onEvent({ type: "agent_end", messages: session.messages });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    onEvent({ type: "error", error: errorMsg });
  } finally {
    session.isStreaming = false;
    session.abortController = null;
  }

  // Process follow-up queue (loop, not recursion)
  while (session.followUpQueue.length > 0) {
    const next = session.followUpQueue.shift()!;
    session.isStreaming = true;
    session.abortController = new AbortController();
    session.messages.push({ role: "user", content: next, timestamp: Date.now() });
    onEvent({ type: "agent_start" });

    try {
      while (true) {
        while (session.steerQueue.length > 0) {
          const steerMsg = session.steerQueue.shift()!;
          session.messages.push({ role: "user", content: `[STEER] ${steerMsg}`, timestamp: Date.now() });
          onEvent({ type: "steer", message: steerMsg });
        }
        onEvent({ type: "turn_start" });
        const llmTools: Tool[] = ctx.tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
        const followUpApiKey = await chat_getApiKey(ctx.home, session.model.provider) || session.apiKey;
        const stream = ai_stream(session.model, { systemPrompt: session.systemPrompt, messages: session.messages, tools: llmTools.length > 0 ? llmTools : undefined }, { apiKey: followUpApiKey, signal: session.abortController.signal });
        let assistantMessage: AssistantMessage | null = null;
        for await (const event of stream) {
          if (event.type === "text_delta") onEvent({ type: "text_delta", delta: event.delta });
          else if (event.type === "thinking_delta") onEvent({ type: "thinking_delta", delta: event.delta });
          else if (event.type === "done") assistantMessage = event.message;
          else if (event.type === "error") assistantMessage = event.error;
        }
        if (!assistantMessage) break;
        session.messages.push(assistantMessage);
        if (assistantMessage.stopReason === "error" || assistantMessage.stopReason === "aborted") {
          onEvent({ type: "error", error: assistantMessage.errorMessage || "Unknown error" });
          break;
        }
        onEvent({ type: "turn_end", message: assistantMessage });
        const toolCalls = assistantMessage.content.filter((b) => b.type === "toolCall") as ToolCall[];
        if (toolCalls.length === 0) break;
        const toolResults = await agent_executeTools(ctx, session, toolCalls, onEvent, session.abortController?.signal);
        session.messages.push(...toolResults);
      }
      onEvent({ type: "agent_end", messages: session.messages });
    } catch (err) {
      onEvent({ type: "error", error: err instanceof Error ? err.message : String(err) });
    } finally {
      session.isStreaming = false;
      session.abortController = null;
    }
  }
}

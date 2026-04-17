import type { ToolCall, ToolResultMessage } from "../ai_type_Message.ts";
import type { Ctx } from "../agent_type_Ctx.ts";
import type { Session } from "../chat_type_Session.ts";
import type { AgentEvent } from "../agent_type_Event.ts";

export async function agent_executeTools(
  ctx: Ctx,
  session: Session,
  toolCalls: ToolCall[],
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<ToolResultMessage[]> {
  const results: ToolResultMessage[] = [];

  for (const tc of toolCalls) {
    const tool = ctx.tools.find((t) => t.name === tc.name);

    onEvent({ type: "tool_execution_start", toolCallId: tc.id, toolName: tc.name, args: tc.arguments });

    if (!tool) {
      const result: ToolResultMessage = {
        role: "toolResult",
        toolCallId: tc.id,
        toolName: tc.name,
        content: [{ type: "text", text: `Tool not found: ${tc.name}` }],
        isError: true,
        timestamp: Date.now(),
      };
      results.push(result);
      onEvent({ type: "tool_execution_end", toolCallId: tc.id, toolName: tc.name, result: { content: result.content }, isError: true });
      continue;
    }

    try {
      const toolResult = await tool.execute(ctx, session, tc.arguments, signal);
      const result: ToolResultMessage = {
        role: "toolResult",
        toolCallId: tc.id,
        toolName: tc.name,
        content: toolResult.content,
        isError: false,
        timestamp: Date.now(),
      };
      results.push(result);
      onEvent({ type: "tool_execution_end", toolCallId: tc.id, toolName: tc.name, result: toolResult, isError: false });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const result: ToolResultMessage = {
        role: "toolResult",
        toolCallId: tc.id,
        toolName: tc.name,
        content: [{ type: "text", text: errorMsg }],
        isError: true,
        timestamp: Date.now(),
      };
      results.push(result);
      onEvent({ type: "tool_execution_end", toolCallId: tc.id, toolName: tc.name, result: { content: result.content }, isError: true });
    }
  }

  return results;
}

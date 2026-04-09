import type { AssistantMessage, Message } from "./ai_type_Message.ts";

export function chat_view_stats(messages: Message[]): string {
  const assistantMessages = messages.filter((m) => m.role === "assistant") as AssistantMessage[];
  if (assistantMessages.length === 0) return "";

  let totalTokens = 0;
  let totalCost = 0;
  for (const msg of assistantMessages) {
    totalTokens += msg.usage.totalTokens;
    totalCost += msg.usage.cost.total;
  }

  const turns = assistantMessages.length;
  const costStr = totalCost > 0 ? ` | $${totalCost.toFixed(4)}` : "";

  return (
    <div id="stats" data-role="stats" className="text-xs text-gray-400 text-center py-1">
      {turns} turn{turns > 1 ? "s" : ""} | {totalTokens} tokens{costStr}
    </div>
  );
}

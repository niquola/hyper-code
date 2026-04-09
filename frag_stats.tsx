import { chat_getCtx } from "./chat_ctx.ts";
import type { AssistantMessage } from "./ai_type_Message.ts";

export default async function (req: Request) {
  const ctx = await chat_getCtx();
  const assistantMessages = ctx.messages.filter((m) => m.role === "assistant") as AssistantMessage[];

  let totalTokens = 0;
  let totalCost = 0;
  for (const msg of assistantMessages) {
    totalTokens += msg.usage.totalTokens;
    totalCost += msg.usage.cost.total;
  }

  if (assistantMessages.length === 0) return `<span id="nav-stats"></span>`;

  const costStr = totalCost > 0 ? ` · $${totalCost.toFixed(4)}` : "";
  return `<span id="nav-stats" class="text-xs text-gray-400">${totalTokens} tok${costStr}</span>`;
}

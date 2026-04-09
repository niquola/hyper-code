import { agent_run } from "./agent_run.ts";
import { chat_createSSEStream } from "./chat_sse.ts";
import { chat_getCtx, chat_saveMessages } from "./chat_ctx.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const prompt = form.get("prompt") as string;
  if (!prompt?.trim()) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  const ctx = await chat_getCtx();
  const msgsBefore = ctx.messages.length;

  return chat_createSSEStream((onEvent) =>
    agent_run(ctx, prompt, (event) => {
      onEvent(event);
      if (event.type === "agent_end") {
        const newMsgs = ctx.messages.slice(msgsBefore);
        chat_saveMessages(...newMsgs);
      }
    }),
  );
}

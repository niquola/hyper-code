import { agent_run } from "./agent_run.ts";
import { chat_createSSEStream } from "./chat_sse.ts";
import { chat_getCtx } from "./chat_ctx.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const prompt = form.get("prompt") as string;
  if (!prompt?.trim()) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  const ctx = await chat_getCtx();
  return chat_createSSEStream((onEvent) => agent_run(ctx, prompt, onEvent));
}

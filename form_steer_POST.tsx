import { chat_getCtx } from "./chat_ctx.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const prompt = form.get("prompt") as string;
  if (!prompt?.trim()) {
    return new Response("empty", { status: 400 });
  }

  const ctx = await chat_getCtx();
  ctx.steerQueue.push(prompt.trim());
  return new Response("ok");
}

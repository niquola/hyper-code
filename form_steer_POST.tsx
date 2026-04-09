import { chat_getSession } from "./chat_ctx.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const prompt = form.get("prompt") as string;
  if (!prompt?.trim()) {
    return new Response("empty", { status: 400 });
  }

  const session = await chat_getSession();
  session.steerQueue.push(prompt.trim());
  return new Response("ok");
}

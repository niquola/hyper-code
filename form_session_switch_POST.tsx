import { chat_switchSession } from "./chat_ctx.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const filename = form.get("filename") as string;
  if (!filename) return new Response(null, { status: 302, headers: { Location: "/" } });

  await chat_switchSession(filename);
  return new Response(null, { status: 302, headers: { Location: "/" } });
}

import { chat_sessionDelete } from "./chat_session.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const filename = form.get("filename") as string;
  if (!filename) return new Response(null, { status: 302, headers: { Location: "/" } });

  chat_sessionDelete(filename);
  return new Response(null, { status: 302, headers: { Location: "/" } });
}

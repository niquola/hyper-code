import { chat_sessionSetTitle } from "./chat_session.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const filename = form.get("filename") as string;
  const title = form.get("title") as string;
  if (!filename || !title?.trim()) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  await chat_sessionSetTitle(filename, title.trim());
  return new Response(null, { status: 302, headers: { Location: "/" } });
}

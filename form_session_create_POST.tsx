import { chat_sessionCreate, chat_sessionSetTitle } from "./chat_session.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const title = (form.get("title") as string)?.trim();

  const filename = chat_sessionCreate();
  if (title) await chat_sessionSetTitle(filename, title);

  // Redirect to new session URL — no global state change needed
  return new Response(null, {
    status: 302,
    headers: { Location: `/session/${encodeURIComponent(filename)}/` },
  });
}

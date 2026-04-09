import { getDb } from "./chat_db.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const filename = form.get("filename") as string;
  const title = form.get("title") as string;
  if (!filename || !title?.trim()) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  getDb().setSessionTitle(filename, title.trim());
  return new Response(null, { status: 302, headers: { Location: "/" } });
}

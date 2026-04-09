import { agent_run } from "./agent_run.ts";
import { chat_createSSEStream } from "./chat_sse.ts";
import { chat_getCtx, chat_getSession } from "./chat_ctx.ts";
import { chat_sessionAppend } from "./chat_session.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const prompt = form.get("prompt") as string;
  if (!prompt?.trim()) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  const ctx = await chat_getCtx();
  const session = await chat_getSession();

  // If agent is already streaming, queue as follow-up
  if (session.isStreaming) {
    session.followUpQueue.push(prompt.trim());
    return new Response(JSON.stringify({ queued: "followUp" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Capture filename — session object may be replaced if user switches sessions
  const filename = session.filename;
  const msgsBefore = session.messages.length;

  return chat_createSSEStream((onEvent) =>
    agent_run(ctx, session, prompt, (event) => {
      onEvent(event);
      if (event.type === "agent_end") {
        const newMsgs = session.messages.slice(msgsBefore);
        if (newMsgs.length > 0) {
          chat_sessionAppend(filename, ...newMsgs);
        }
      }
    }),
  );
}

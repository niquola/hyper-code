import { chat_switchSession, chat_getSession } from "./chat_ctx.ts";

export default async function (req: Request, params: { filename: string }) {
  const filename = decodeURIComponent(params.filename);
  const session = await chat_getSession();

  // Only serve if this is the right session and it's streaming
  if (session.filename !== filename || !session.isStreaming) {
    return new Response("not streaming", { status: 204 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(ctrl) {
      const listener = (html: string) => {
        if (closed) return;
        try {
          const lines = html.split("\n").map((l) => `data: ${l}`).join("\n");
          ctrl.enqueue(encoder.encode(`${lines}\n\n`));
        } catch {
          closed = true;
          session.sseListeners.delete(listener);
        }
      };

      session.sseListeners.add(listener);

      // Clean up when client disconnects
      req.signal.addEventListener("abort", () => {
        closed = true;
        session.sseListeners.delete(listener);
        try { ctrl.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

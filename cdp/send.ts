import type { CdpCtx, CdpSession } from "./type_Ctx.ts";

async function cdp_getSession(ctx: CdpCtx, name: string): Promise<CdpSession> {
  const existing = ctx.sessions.get(name);
  if (existing && existing.ws.readyState === WebSocket.OPEN) return existing;

  const res = await fetch(`http://127.0.0.1:${ctx.chromePort}/json`);
  const targets = await res.json() as any[];

  let target = targets.find((t: any) => t.type === "page" && t.title !== "about:blank");
  if (!target) target = targets.find((t: any) => t.type === "page");
  if (!target) {
    const newRes = await fetch(`http://127.0.0.1:${ctx.chromePort}/json/new`);
    target = await newRes.json();
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = (e) => reject(e);
  });

  const session = { ws, targetId: target.id };
  ctx.sessions.set(name, session);
  return session;
}

export async function cdp_send(
  ctx: CdpCtx,
  sessionName: string,
  method: string,
  params: any = {},
): Promise<any> {
  const { ws } = await cdp_getSession(ctx, sessionName);
  const id = cdp_nextId(ctx);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("CDP timeout")), 30_000);

    const handler = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string);
      if (data.id === id) {
        clearTimeout(timeout);
        ws.removeEventListener("message", handler);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

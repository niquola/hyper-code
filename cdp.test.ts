import { describe, expect, test } from "bun:test";
import { cdp_createCtx } from "./cdp_createCtx.ts";
import { cdp_send } from "./cdp_send.ts";

class FakeWebSocket {
  readyState = WebSocket.OPEN;
  sent: string[] = [];
  private listeners = new Set<(event: MessageEvent) => void>();

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (type === "message") this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (type === "message") this.listeners.delete(listener);
  }

  send(payload: string): void {
    this.sent.push(payload);
    const req = JSON.parse(payload);
    const event = { data: JSON.stringify({ id: req.id, result: { method: req.method, params: req.params } }) } as MessageEvent;
    for (const listener of [...this.listeners]) listener(event);
  }
}

describe("cdp", () => {
  test("cdp_createCtx initializes explicit state", () => {
    const ctx = cdp_createCtx({ cdpPort: 2230, chromePort: 9223, profileDir: ".chrome-profile" });
    expect(ctx.cdpPort).toBe(2230);
    expect(ctx.chromePort).toBe(9223);
    expect(ctx.profileDir).toBe(".chrome-profile");
    expect(ctx.sessions.size).toBe(0);
    expect(ctx.nextId).toBe(1);
  });

  test("cdp_send uses ctx state and increments message id", async () => {
    const ctx = cdp_createCtx({ cdpPort: 2230, chromePort: 9223, profileDir: ".chrome-profile" });
    const ws = new FakeWebSocket();
    ctx.sessions.set("app", { ws: ws as unknown as WebSocket, targetId: "t1" });

    const r1 = await cdp_send(ctx, "app", "Runtime.evaluate", { expression: "1+1" });
    const r2 = await cdp_send(ctx, "app", "Page.navigate", { url: "http://localhost" });

    expect(r1).toEqual({ method: "Runtime.evaluate", params: { expression: "1+1" } });
    expect(r2).toEqual({ method: "Page.navigate", params: { url: "http://localhost" } });

    const p1 = JSON.parse(ws.sent[0]!);
    const p2 = JSON.parse(ws.sent[1]!);
    expect(p1.id).toBe(1);
    expect(p2.id).toBe(2);
    expect(ctx.nextId).toBe(3);
  });
});

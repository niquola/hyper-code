import { test, expect, describe } from "bun:test";
import { AssistantMessageEventStream } from "./ai_EventStream.ts";
import type { AssistantMessage } from "./ai_type_Message.ts";

function makeMsg(text: string): AssistantMessage {
  return {
    role: "assistant", content: [{ type: "text", text }],
    provider: "test", model: "test",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "stop", timestamp: Date.now(),
  };
}

describe("AssistantMessageEventStream", () => {
  test("events pushed before iteration are queued", async () => {
    const stream = new AssistantMessageEventStream();
    const msg = makeMsg("hi");
    stream.push({ type: "start", partial: msg });
    stream.push({ type: "done", reason: "stop", message: msg });
    stream.end();

    const events: string[] = [];
    for await (const e of stream) events.push(e.type);
    expect(events).toEqual(["start", "done"]);
  });

  test("ignores pushes after done", async () => {
    const stream = new AssistantMessageEventStream();
    const msg = makeMsg("hi");
    stream.push({ type: "done", reason: "stop", message: msg });
    stream.push({ type: "start", partial: msg }); // should be ignored
    stream.end();

    const events: string[] = [];
    for await (const e of stream) events.push(e.type);
    expect(events).toEqual(["done"]);
  });

  test("result() works without iterating", async () => {
    const stream = new AssistantMessageEventStream();
    const msg = makeMsg("result");
    setTimeout(() => {
      stream.push({ type: "done", reason: "stop", message: msg });
      stream.end();
    }, 10);

    const result = await stream.result();
    expect((result.content[0] as any).text).toBe("result");
  });

  test("handles error events", async () => {
    const stream = new AssistantMessageEventStream();
    const msg: AssistantMessage = { ...makeMsg(""), stopReason: "error", errorMessage: "fail" };
    stream.push({ type: "error", reason: "error", error: msg });
    stream.end();

    const result = await stream.result();
    expect(result.stopReason).toBe("error");
    expect(result.errorMessage).toBe("fail");
  });

  test("concurrent iteration and push", async () => {
    const stream = new AssistantMessageEventStream();
    const msg = makeMsg("hi");

    const iterPromise = (async () => {
      const events: string[] = [];
      for await (const e of stream) events.push(e.type);
      return events;
    })();

    await Bun.sleep(10);
    stream.push({ type: "start", partial: msg });
    stream.push({ type: "text_start", contentIndex: 0, partial: msg });
    stream.push({ type: "text_delta", contentIndex: 0, delta: "h", partial: msg });
    stream.push({ type: "text_delta", contentIndex: 0, delta: "i", partial: msg });
    stream.push({ type: "text_end", contentIndex: 0, content: "hi", partial: msg });
    stream.push({ type: "done", reason: "stop", message: msg });
    stream.end();

    const events = await iterPromise;
    expect(events).toEqual(["start", "text_start", "text_delta", "text_delta", "text_end", "done"]);
  });
});

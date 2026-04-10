import { test, expect, describe } from "bun:test";
import {
  ai_stream_createAssistantMessageEventStream,
  ai_stream_create,
  ai_stream_push,
  ai_stream_end,
  ai_stream_result,
  ai_stream_iter,
} from "./ai_EventStream.ts";
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
    const stream = ai_stream_createAssistantMessageEventStream();
    const msg = makeMsg("hi");
    stream.push({ type: "start", partial: msg });
    stream.push({ type: "done", reason: "stop", message: msg });
    stream.end();

    const events: string[] = [];
    for await (const e of stream) events.push(e.type);
    expect(events).toEqual(["start", "done"]);
  });

  test("ignores pushes after done", async () => {
    const stream = ai_stream_createAssistantMessageEventStream();
    const msg = makeMsg("hi");
    stream.push({ type: "done", reason: "stop", message: msg });
    stream.push({ type: "start", partial: msg }); // should be ignored
    stream.end();

    const events: string[] = [];
    for await (const e of stream) events.push(e.type);
    expect(events).toEqual(["done"]);
  });

  test("result() works without iterating", async () => {
    const stream = ai_stream_createAssistantMessageEventStream();
    const msg = makeMsg("result");
    setTimeout(() => {
      stream.push({ type: "done", reason: "stop", message: msg });
      stream.end();
    }, 10);

    const result = await stream.result();
    expect((result.content[0] as any).text).toBe("result");
  });

  test("handles error events", async () => {
    const stream = ai_stream_createAssistantMessageEventStream();
    const msg: AssistantMessage = { ...makeMsg(""), stopReason: "error", errorMessage: "fail" };
    stream.push({ type: "error", reason: "error", error: msg });
    stream.end();

    const result = await stream.result();
    expect(result.stopReason).toBe("error");
    expect(result.errorMessage).toBe("fail");
  });

  test("concurrent iteration and push", async () => {
    const stream = ai_stream_createAssistantMessageEventStream();
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

describe("ai_stream generic functions", () => {
  test("terminal event resolves final result", async () => {
    const stream = ai_stream_create<number, number>((e) => e === 2, (e) => e * 10);
    ai_stream_push(stream, 2);
    const result = await ai_stream_result(stream);
    expect(result).toBe(20);
  });

  test("end(result) resolves final result without terminal event", async () => {
    const stream = ai_stream_create<number, string>(() => false, () => "never");
    ai_stream_end(stream, "manual");
    const result = await ai_stream_result(stream);
    expect(result).toBe("manual");
  });

  test("end() closes waiting iterator", async () => {
    const stream = ai_stream_create<number, number>(() => false, (e) => e);

    const collectedPromise = (async () => {
      const events: number[] = [];
      for await (const e of ai_stream_iter(stream)) events.push(e);
      return events;
    })();

    await Bun.sleep(10);
    ai_stream_end(stream);

    expect(await collectedPromise).toEqual([]);
  });

  test("iterates pushed events in order", async () => {
    const stream = ai_stream_create<number, number>((e) => e === 3, (e) => e);

    const collectedPromise = (async () => {
      const events: number[] = [];
      for await (const e of ai_stream_iter(stream)) events.push(e);
      return events;
    })();

    ai_stream_push(stream, 1);
    ai_stream_push(stream, 2);
    ai_stream_push(stream, 3);
    ai_stream_end(stream);

    expect(await collectedPromise).toEqual([1, 2, 3]);
  });
});

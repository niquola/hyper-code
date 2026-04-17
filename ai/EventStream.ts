import type { AssistantMessage } from "../ai/type_Message.ts";
import type { AssistantMessageEvent } from "../ai/type_Event.ts";

export type EventStream<T, R> = {
  queue: T[];
  waiting: Array<(value: IteratorResult<T>) => void>;
  done: boolean;
  finalResultPromise: Promise<R>;
  resolveFinalResult: (result: R) => void;
  isComplete: (event: T) => boolean;
  extractResult: (event: T) => R;
};

export function ai_stream_create<T, R>(
  isComplete: (event: T) => boolean,
  extractResult: (event: T) => R,
): EventStream<T, R> {
  let resolveFinalResult!: (result: R) => void;
  const finalResultPromise = new Promise<R>((resolve) => {
    resolveFinalResult = resolve;
  });

  return {
    queue: [],
    waiting: [],
    done: false,
    finalResultPromise,
    resolveFinalResult,
    isComplete,
    extractResult,
  };
}

export function ai_stream_push<T, R>(stream: EventStream<T, R>, event: T): void {
  if (stream.done) return;
  if (stream.isComplete(event)) {
    stream.done = true;
    stream.resolveFinalResult(stream.extractResult(event));
  }

  const waiter = stream.waiting.shift();
  if (waiter) {
    waiter({ value: event, done: false });
  } else {
    stream.queue.push(event);
  }
}

export function ai_stream_end<T, R>(stream: EventStream<T, R>, result?: R): void {
  stream.done = true;
  if (result !== undefined) {
    stream.resolveFinalResult(result);
  }

  while (stream.waiting.length > 0) {
    const waiter = stream.waiting.shift()!;
    waiter({ value: undefined as any, done: true });
  }
}

export async function* ai_stream_iter<T, R>(stream: EventStream<T, R>): AsyncIterableIterator<T> {
  while (true) {
    if (stream.queue.length > 0) {
      yield stream.queue.shift()!;
    } else if (stream.done) {
      return;
    } else {
      const result = await new Promise<IteratorResult<T>>((resolve) => stream.waiting.push(resolve));
      if (result.done) return;
      yield result.value;
    }
  }
}

export function ai_stream_result<T, R>(stream: EventStream<T, R>): Promise<R> {
  return stream.finalResultPromise;
}

export type AssistantMessageEventStream = EventStream<AssistantMessageEvent, AssistantMessage> & {
  push: (event: AssistantMessageEvent) => void;
  end: (result?: AssistantMessage) => void;
  result: () => Promise<AssistantMessage>;
  [Symbol.asyncIterator]: () => AsyncIterableIterator<AssistantMessageEvent>;
};

export default function ai_stream_createAssistantMessageEventStream(): AssistantMessageEventStream {
  const stream = ai_stream_create<AssistantMessageEvent, AssistantMessage>(
    (event) => event.type === "done" || event.type === "error",
    (event) => {
      if (event.type === "done") return event.message;
      if (event.type === "error") return event.error;
      throw new Error("Unexpected event type for final result");
    },
  ) as AssistantMessageEventStream;

  stream.push = (event) => ai_stream_push(stream, event);
  stream.end = (result) => ai_stream_end(stream, result);
  stream.result = () => ai_stream_result(stream);
  stream[Symbol.asyncIterator] = () => ai_stream_iter(stream);

  return stream;
}

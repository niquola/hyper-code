// OpenAI Codex streaming via chatgpt.com/backend-api/codex/responses
// Uses raw fetch with custom headers instead of OpenAI SDK.
// Response format is the same Responses API SSE events.

import type { ResponseStreamEvent } from "openai/resources/responses/responses.js";
import type { AssistantMessage, Context, StopReason, TextContent, ThinkingContent, ToolCall } from "../ai_type_Message.ts";
import type { Model } from "../ai_type_Model.ts";
import type { StreamOptions } from "../ai_type_StreamOptions.ts";
import { ai_stream_createAssistantMessageEventStream, type AssistantMessageEventStream } from "./EventStream.ts";
import { ai_getEnvApiKey } from "./getEnvApiKey.ts";
import { auth_codexRefresh } from "../auth_codex.ts";
import { chat_saveApiKey } from "../chat/apiKeys.ts";
import { ai_calculateCost } from "./calculateCost.ts";
import { ai_parseStreamingJson } from "./parseStreamingJson.ts";
import { ai_sanitizeSurrogates } from "./sanitizeSurrogates.ts";
import { ai_transformMessages } from "./transformMessages.ts";
import { ai_shortHash } from "./shortHash.ts";
import type { ResponseInput, ResponseInputContent } from "openai/resources/responses/responses.js";

const DEFAULT_CODEX_BASE_URL = "https://chatgpt.com/backend-api";
const JWT_CLAIM_PATH = "https://api.openai.com/auth";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// --- Auth helpers ---

function extractAccountId(token: string): string {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token");
    const payload = JSON.parse(atob(parts[1]!));
    const accountId = payload?.[JWT_CLAIM_PATH]?.chatgpt_account_id;
    if (!accountId) throw new Error("No account ID in token");
    return accountId;
  } catch {
    throw new Error("Failed to extract accountId from token");
  }
}

function resolveCodexUrl(baseUrl?: string): string {
  const raw = baseUrl && baseUrl.trim().length > 0 ? baseUrl : DEFAULT_CODEX_BASE_URL;
  const normalized = raw.replace(/\/+$/, "");
  if (normalized.endsWith("/codex/responses")) return normalized;
  if (normalized.endsWith("/codex")) return `${normalized}/responses`;
  return `${normalized}/codex/responses`;
}

function buildCodexHeaders(accountId: string, token: string, extra?: Record<string, string>): Headers {
  const headers = new Headers(extra);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("chatgpt-account-id", accountId);
  headers.set("originator", "hyper-code");
  headers.set("OpenAI-Beta", "responses=experimental");
  headers.set("accept", "text/event-stream");
  headers.set("content-type", "application/json");
  return headers;
}

// --- SSE parser ---

async function* parseSSE(response: Response): AsyncGenerator<Record<string, unknown>> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx = buffer.indexOf("\n\n");
      while (idx !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        const dataLines = chunk
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim());
        if (dataLines.length > 0) {
          const data = dataLines.join("\n").trim();
          if (data && data !== "[DONE]") {
            try { yield JSON.parse(data); } catch {}
          }
        }
        idx = buffer.indexOf("\n\n");
      }
    }
  } finally {
    try { await reader.cancel(); } catch {}
    try { reader.releaseLock(); } catch {}
  }
}

function isRetryableError(status: number, text: string): boolean {
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  return /rate.?limit|overloaded|service.?unavailable/i.test(text);
}

// --- Main stream function ---

export function ai_streamCodex(model: Model, context: Context, options?: StreamOptions): AssistantMessageEventStream {
  const stream = ai_stream_createAssistantMessageEventStream();

  (async () => {
    const output: AssistantMessage = {
      role: "assistant",
      content: [],
      provider: model.provider,
      model: model.id,
      usage: {
        input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "stop",
      timestamp: Date.now(),
    };

    try {
      const apiKey = options?.apiKey || ai_getEnvApiKey(options?.home || "/tmp", model.provider);
      if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);

      const accountId = extractAccountId(apiKey);
      const headers = buildCodexHeaders(accountId, apiKey, { ...model.headers, ...options?.headers });

      const input = convertMessages(model, context);
      const body: Record<string, unknown> = {
        model: model.id,
        store: false,
        stream: true,
        instructions: context.systemPrompt,
        input,
        text: { verbosity: "medium" },
        prompt_cache_key: options?.sessionId || undefined,
        include: ["reasoning.encrypted_content"],
        tool_choice: "auto",
        parallel_tool_calls: true,
      };

      // Note: Codex does not support max_output_tokens or temperature

      if (context.tools && context.tools.length > 0) {
        body.tools = context.tools.map((t) => ({
          type: "function",
          name: t.name,
          description: t.description,
          parameters: t.parameters,
          strict: null,
        }));
      }

      if (model.reasoning && options?.reasoningEffort) {
        body.reasoning = { effort: options.reasoningEffort, summary: "auto" };
      } else if (model.reasoning) {
        body.reasoning = { effort: "medium", summary: "auto" };
      }

      // Fetch with retry
      const url = resolveCodexUrl(model.baseUrl);
      const bodyJson = JSON.stringify(body);
      let response: Response | undefined;
      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (options?.signal?.aborted) throw new Error("Request was aborted");

        try {
          response = await fetch(url, {
            method: "POST",
            headers,
            body: bodyJson,
            signal: options?.signal,
          });

          if (response.ok) break;

          const errorText = await response.text();
          if (attempt < MAX_RETRIES && isRetryableError(response.status, errorText)) {
            await Bun.sleep(BASE_DELAY_MS * 2 ** attempt);
            continue;
          }

          // Parse error for friendly message
          let message = `Codex API error: ${response.status}`;
          try {
            const parsed = JSON.parse(errorText);
            const err = parsed?.error;
            if (err) {
              const code = err.code || err.type || "";
              if (/missing_scope|insufficient_permissions/i.test(code) || /missing scopes/i.test(err.message || "")) {
                // Try auto-refresh from ~/.codex/auth.json refresh_token
                try {
                  const home = options?.home || "/tmp";
                  const authFile = `${home}/.codex/auth.json`;
                  const auth = JSON.parse(require("node:fs").readFileSync(authFile, "utf-8"));
                  const refreshToken = auth.tokens?.refresh_token;
                  if (refreshToken) {
                    const creds = await auth_codexRefresh(refreshToken);
                    // Save refreshed token
                    auth.tokens.access_token = creds.access;
                    auth.tokens.refresh_token = creds.refresh;
                    auth.tokens.account_id = creds.accountId;
                    auth.last_refresh = new Date().toISOString();
                    require("node:fs").writeFileSync(authFile, JSON.stringify(auth, null, 2));
                    await chat_saveApiKey(home, "openai-codex", creds.access);
                    message = `CODEX_AUTH_REFRESHED: Token refreshed. Please retry your message.`;
                  } else {
                    message = `CODEX_AUTH_EXPIRED: Codex token expired. Please re-login.`;
                  }
                } catch (refreshErr) {
                  message = `CODEX_AUTH_EXPIRED: Codex token expired and auto-refresh failed. Please re-login.`;
                }
              } else if (/usage_limit|rate_limit/i.test(code)) {
                const plan = err.plan_type ? ` (${err.plan_type} plan)` : "";
                const mins = err.resets_at ? Math.max(0, Math.round((err.resets_at * 1000 - Date.now()) / 60000)) : undefined;
                const when = mins !== undefined ? ` Try again in ~${mins} min.` : "";
                message = `ChatGPT usage limit reached${plan}.${when}`;
              } else {
                message = err.message || message;
              }
            }
          } catch {}
          throw new Error(message);
        } catch (error) {
          if (error instanceof Error && (error.name === "AbortError" || error.message === "Request was aborted")) {
            throw new Error("Request was aborted");
          }
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt < MAX_RETRIES && !lastError.message.includes("usage limit")) {
            await Bun.sleep(BASE_DELAY_MS * 2 ** attempt);
            continue;
          }
          throw lastError;
        }
      }

      if (!response?.ok) throw lastError ?? new Error("Failed after retries");
      if (!response.body) throw new Error("No response body");

      stream.push({ type: "start", partial: output });

      // Process SSE events — same format as Responses API
      let currentBlock: ThinkingContent | TextContent | (ToolCall & { partialJson: string }) | null = null;
      const blocks = output.content;
      const blockIndex = () => blocks.length - 1;

      for await (const raw of parseSSE(response)) {
        const event = raw as any;
        const type = event.type as string | undefined;
        if (!type) continue;

        // Codex-specific error events
        if (type === "error") {
          throw new Error(`Codex error: ${event.message || event.code || JSON.stringify(event)}`);
        }
        if (type === "response.failed") {
          throw new Error(event.response?.error?.message || "Codex response failed");
        }

        // Normalize codex "response.done" → "response.completed"
        if (type === "response.done" || type === "response.completed" || type === "response.incomplete") {
          // Process as response.completed
          const resp = event.response;
          if (resp) {
            output.responseId = resp.id || output.responseId;
            if (resp.usage) {
              const cachedTokens = resp.usage.input_tokens_details?.cached_tokens || 0;
              output.usage = {
                input: (resp.usage.input_tokens || 0) - cachedTokens,
                output: resp.usage.output_tokens || 0,
                cacheRead: cachedTokens, cacheWrite: 0,
                totalTokens: resp.usage.total_tokens || 0,
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
              };
              ai_calculateCost(model, output.usage);
            }
            const status = typeof resp.status === "string" ? resp.status : "completed";
            output.stopReason = mapStopReason(status);
            if (output.content.some((b) => b.type === "toolCall") && output.stopReason === "stop") {
              output.stopReason = "toolUse";
            }
          }
          continue;
        }

        // Standard Responses API events
        if (type === "response.created") {
          output.responseId = event.response?.id;
        } else if (type === "response.output_item.added") {
          const item = event.item;
          if (item.type === "reasoning") {
            currentBlock = { type: "thinking", thinking: "" };
            output.content.push(currentBlock);
            stream.push({ type: "thinking_start", contentIndex: blockIndex(), partial: output });
          } else if (item.type === "message") {
            currentBlock = { type: "text", text: "" };
            output.content.push(currentBlock);
            stream.push({ type: "text_start", contentIndex: blockIndex(), partial: output });
          } else if (item.type === "function_call") {
            currentBlock = {
              type: "toolCall", id: `${item.call_id}|${item.id}`,
              name: item.name, arguments: {}, partialJson: item.arguments || "",
            };
            output.content.push(currentBlock);
            stream.push({ type: "toolcall_start", contentIndex: blockIndex(), partial: output });
          }
        } else if (type === "response.reasoning_summary_text.delta") {
          if (currentBlock?.type === "thinking") {
            currentBlock.thinking += event.delta;
            stream.push({ type: "thinking_delta", contentIndex: blockIndex(), delta: event.delta, partial: output });
          }
        } else if (type === "response.output_text.delta") {
          if (currentBlock?.type === "text") {
            currentBlock.text += event.delta;
            stream.push({ type: "text_delta", contentIndex: blockIndex(), delta: event.delta, partial: output });
          }
        } else if (type === "response.refusal.delta") {
          if (currentBlock?.type === "text") {
            currentBlock.text += event.delta;
            stream.push({ type: "text_delta", contentIndex: blockIndex(), delta: event.delta, partial: output });
          }
        } else if (type === "response.function_call_arguments.delta") {
          if (currentBlock?.type === "toolCall") {
            currentBlock.partialJson += event.delta;
            currentBlock.arguments = ai_parseStreamingJson(currentBlock.partialJson);
            stream.push({ type: "toolcall_delta", contentIndex: blockIndex(), delta: event.delta, partial: output });
          }
        } else if (type === "response.output_item.done") {
          const item = event.item;
          if (item.type === "reasoning" && currentBlock?.type === "thinking") {
            currentBlock.thinking = item.summary?.map((s: any) => s.text).join("\n\n") || currentBlock.thinking;
            currentBlock.thinkingSignature = JSON.stringify(item);
            stream.push({ type: "thinking_end", contentIndex: blockIndex(), content: currentBlock.thinking, partial: output });
            currentBlock = null;
          } else if (item.type === "message" && currentBlock?.type === "text") {
            currentBlock.text = item.content.map((c: any) => c.type === "output_text" ? c.text : c.refusal).join("");
            stream.push({ type: "text_end", contentIndex: blockIndex(), content: currentBlock.text, partial: output });
            currentBlock = null;
          } else if (item.type === "function_call") {
            const args = currentBlock?.type === "toolCall" && currentBlock.partialJson
              ? ai_parseStreamingJson(currentBlock.partialJson)
              : ai_parseStreamingJson(item.arguments || "{}");
            const toolCall: ToolCall = {
              type: "toolCall", id: `${item.call_id}|${item.id}`,
              name: item.name, arguments: args,
            };
            currentBlock = null;
            stream.push({ type: "toolcall_end", contentIndex: blockIndex(), toolCall, partial: output });
          }
        }
      }

      if (options?.signal?.aborted) throw new Error("Request was aborted");

      stream.push({ type: "done", reason: output.stopReason as "stop" | "length" | "toolUse", message: output });
      stream.end();
    } catch (error) {
      output.stopReason = options?.signal?.aborted ? "aborted" : "error";
      output.errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      stream.push({ type: "error", reason: output.stopReason, error: output });
      stream.end();
    }
  })();

  return stream;
}

// --- Message conversion (same as ai_streamResponses) ---

function convertMessages(model: Model, context: Context): ResponseInput {
  const messages: ResponseInput = [];
  const transformed = ai_transformMessages(context.messages);

  for (const msg of transformed) {
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        messages.push({ role: "user", content: [{ type: "input_text", text: ai_sanitizeSurrogates(msg.content) }] });
      } else {
        const content: ResponseInputContent[] = msg.content.map((item) => {
          if (item.type === "text") return { type: "input_text" as const, text: ai_sanitizeSurrogates(item.text) };
          return { type: "input_image" as const, detail: "auto" as const, image_url: `data:${item.mimeType};base64,${item.data}` };
        });
        const filtered = !model.input.includes("image") ? content.filter((c) => c.type !== "input_image") : content;
        if (filtered.length === 0) continue;
        messages.push({ role: "user", content: filtered });
      }
    } else if (msg.role === "assistant") {
      for (const block of msg.content) {
        if (block.type === "thinking" && block.thinkingSignature) {
          try { messages.push(JSON.parse(block.thinkingSignature)); } catch {}
        } else if (block.type === "text") {
          messages.push({
            type: "message", role: "assistant",
            content: [{ type: "output_text", text: ai_sanitizeSurrogates(block.text), annotations: [] }],
            status: "completed", id: `msg_${ai_shortHash(block.text)}`,
          } as any);
        } else if (block.type === "toolCall") {
          const [callId, itemId] = block.id.split("|");
          messages.push({
            type: "function_call", id: itemId, call_id: callId,
            name: block.name, arguments: JSON.stringify(block.arguments),
          } as any);
        }
      }
    } else if (msg.role === "toolResult") {
      const textResult = msg.content.filter((c) => c.type === "text").map((c) => (c as TextContent).text).join("\n");
      const [callId] = msg.toolCallId.split("|");
      messages.push({ type: "function_call_output", call_id: callId!, output: ai_sanitizeSurrogates(textResult || "(empty)") } as any);
    }
  }

  return messages;
}

function mapStopReason(status: string | undefined): StopReason {
  switch (status) {
    case "completed": return "stop";
    case "incomplete": return "length";
    case "failed": case "cancelled": return "error";
    default: return "stop";
  }
}

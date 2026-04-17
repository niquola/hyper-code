import type { Ctx } from "../agent/type_Ctx.ts";
import type { Session } from "./type_Session.ts";
import type { Message } from "../ai/type_Message.ts";

export const sessions = new Map<string, Session>();
export const messageCache = new Map<string, Message[]>();
export let _ctx: Ctx | null = null;

export function setCtx(ctx: Ctx) { _ctx = ctx; }
export function getCtx(): Ctx { if (!_ctx) throw new Error("chat not started"); return _ctx; }

export default function chat_resetSessions(ctx: any): void {
  ctx.state.chat.sessions.clear();
  ctx.state.chat.messageCache.clear();
}

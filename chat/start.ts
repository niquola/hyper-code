export default function chat_start(ctx: any) {
  if (!ctx.state) ctx.state = {};
  ctx.state.chat = {
    sessions: new Map(),
    messageCache: new Map(),
  };
}

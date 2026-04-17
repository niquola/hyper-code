import type { Ctx } from "../agent/type_Ctx.ts";

// POST /api/repl — REPL endpoint (eval, reload, load_all)
// Handler receives repl function from ctx._repl (set by main.ts)

export default async function (ctx: Ctx, req: Request) {
  const replHandler = (ctx as any)._repl;
  if (!replHandler) return Response.json({ error: "REPL not initialized" }, { status: 500 });

  try {
    const body = await req.json();
    const result = await replHandler(body);
    return Response.json(result);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

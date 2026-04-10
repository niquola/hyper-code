// GET /api/sessions — возвращает список сессий как JSON
import type { Ctx } from "./agent_type_Ctx.ts";

export default async function (ctx: Ctx, _req: Request): Promise<Response> {
  const sessions = ctx.db.listSessions();
  const tree: Array<{
    id: string;
    title: string;
    parent?: string;
    depth: number;
  }> = [];

  const nodeMap = new Map<string, typeof sessions[0] & { depth: number }>();
  for (const s of sessions) {
    nodeMap.set(s.session_id, { ...s, depth: 0 });
  }

  const roots: typeof sessions = [];
  for (const s of sessions) {
    if (s.parent && nodeMap.has(s.parent)) {
      // will be processed recursively
    } else {
      roots.push(s);
    }
  }

  function addNode(id: string, depth: number) {
    const s = nodeMap.get(id);
    if (!s) return;
    tree.push({ id: s.session_id, title: s.title, parent: s.parent || undefined, depth });
    // Find children
    for (const [childId, child] of nodeMap) {
      if (child.parent === id) {
        addNode(childId, depth + 1);
      }
    }
  }

  for (const r of roots) {
    addNode(r.session_id, 0);
  }

  return new Response(JSON.stringify({ sessions: tree }), {
    headers: { "Content-Type": "application/json" },
  });
}

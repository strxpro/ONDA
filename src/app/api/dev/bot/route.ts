import { z } from "zod";
import { detectLang, execute, runAgent, runRead, stage } from "@/lib/bot/agent";
import { READ_TOOLS, TOOL_INPUT, type ToolName } from "@/lib/bot/tools";
import { deleteRow, patchRow } from "@/lib/mutations";
import { findFlavor } from "@/lib/ops";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actor = { actor: "dev-bot", source: "telegram" as const };
const PROMO_COMMENTS = ["Il pistacchio più buono della Gallura!", "Buono, ma alle 21 c'era tanta fila."];

/**
 * Local development only: talk to the bot brain without Telegram.
 *   {"text": "Il pistacchio è finito", "confirm": true}          → full pipeline (needs an AI key, e.g. GROQ_API_KEY)
 *   {"tool": "set_flavor_availability", "args": {...}, "confirm": true} → skip the AI: test name matching + execution
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const body = z.object({ text: z.string().optional(), tool: z.string().optional(), args: z.record(z.string(), z.unknown()).optional(), confirm: z.boolean().optional(), cleanup: z.literal("promo").optional() }).parse(await req.json());

  // after recording the presentation film: put back what it changed (pistacchio in stock, no special days from tomorrow on)
  if (body.cleanup === "promo") {
    const ctx = { ...actor, action: "promo_cleanup" };
    const p = await findFlavor("pistacchio");
    if (p && !p.item.is_available_today) await patchRow("flavors", p.item.id, { is_available_today: true }, ctx);
    const today = new Date().toISOString().slice(0, 10);
    for (const d of await store().list("special_days")) if (String(d.date) > today && (d.note as Record<string, string> | null)?.it === "Chiusura anticipata") await deleteRow("special_days", String(d.date), ctx);
    // the demo reviews typed in the film, and the flavor added "by voice"
    for (const c of await store().list("comments")) if (PROMO_COMMENTS.includes(String(c.message))) await deleteRow("comments", String(c.id), ctx);
    for (const f of await store().list("flavors")) if (f.slug === "mirto") await deleteRow("flavors", String(f.id), ctx);
    return Response.json({ ok: true });
  }

  if (body.tool && (READ_TOOLS as readonly string[]).includes(body.tool)) {
    const name = body.tool as (typeof READ_TOOLS)[number];
    return Response.json({ result: await runRead(name, TOOL_INPUT[name].parse(body.args ?? {}) as Record<string, unknown>) });
  }
  if (body.tool) {
    const name = body.tool as ToolName;
    const args = TOOL_INPUT[name].parse(body.args ?? {}) as Record<string, unknown>;
    const r = await stage(name, args, detectLang(JSON.stringify(args)));
    if ("choice" in r) return Response.json({ choice: r.choice });
    const result = body.confirm ? await execute(r.staged, actor) : null;
    return Response.json({ staged: r.staged, applied: Boolean(body.confirm), result });
  }

  const result = await runAgent(body.text ?? "");
  let applied = 0;
  if (body.confirm) {
    for (const s of result.staged) {
      await execute(s, actor);
      applied++;
    }
  }
  return Response.json({ ...result, applied });
}

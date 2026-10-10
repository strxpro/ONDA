import { revalidateTag } from "next/cache";
import { z } from "zod";
import { SITE_TAG } from "@/lib/data";
import { store } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({ id: z.string().uuid(), on: z.boolean() });
const recent = new Map<string, number[]>(); // per-IP throttle (best effort)

/** ♥ on a comment (the browser remembers which ones this visitor liked; the count lives in the database). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= 20) return Response.json({ ok: false }, { status: 429 });
  recent.set(ip, [...hits, now]);

  const s = store();
  const c = await s.get("comments", parsed.data.id);
  if (!c || c.status !== "approved" || !("likes" in c)) return Response.json({ ok: false }, { status: 404 });
  const likes = Math.max(0, Number(c.likes ?? 0) + (parsed.data.on ? 1 : -1));
  await s.put("comments", { ...c, likes });
  try {
    revalidateTag(SITE_TAG);
  } catch {}
  return Response.json({ ok: true, likes });
}

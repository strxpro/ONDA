import { randomUUID } from "node:crypto";
import { z } from "zod";
import { notifyComment } from "@/lib/bot/telegram";
import { store } from "@/lib/store";
import { COMMENT_STICKERS } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1).max(40),
  message: z.string().trim().min(2).max(280),
  flavor_slug: z.string().max(60).nullable().optional(),
  sticker: z.enum(COMMENT_STICKERS).default("heart"),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  locale: z.string().max(5).nullable().optional(),
  /** honeypot: real people never see this field */
  website: z.string().max(0).optional(),
  /** ms the form was open; bots submit instantly */
  elapsed: z.number().min(2500),
});

const MAX_PENDING = 30; // a queue cap so a spam wave can't flood the owner
const recent = new Map<string, number[]>(); // per-IP throttle (best effort, per server instance)

/**
 * A visitor leaves a comment. It is stored as "pending" and appears on the site only after the owner
 * approves it (admin → Commenti, or the ✅ button in the Telegram notification). No personal data is kept.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const d = parsed.data;
  if (/https?:\/\/|www\./i.test(d.message + d.name)) return Response.json({ ok: false, error: "links" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= 3) return Response.json({ ok: false, error: "slow-down" }, { status: 429 });
  recent.set(ip, [...hits, now]);

  const s = store();
  const pending = (await s.list("comments")).filter((c) => c.status === "pending").length;
  if (pending >= MAX_PENDING) return Response.json({ ok: false, error: "busy" }, { status: 503 });

  const row = {
    id: randomUUID(),
    name: d.name,
    message: d.message,
    flavor_slug: d.flavor_slug ?? null,
    sticker: d.sticker,
    rating: d.rating ?? null,
    locale: d.locale ?? null,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  await s.put("comments", row);
  await notifyComment(row);
  return Response.json({ ok: true });
}

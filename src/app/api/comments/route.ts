import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { notifyComment } from "@/lib/bot/telegram";
import { moderate, refreshSiteCache, saveComment, translateComment } from "@/lib/comments";
import { jpegOf } from "@/lib/photos";
import { store } from "@/lib/store";
import { COMMENT_STICKERS } from "@/lib/types";
import { saveImage } from "@/lib/upload";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  name: z.string().trim().min(1).max(40),
  message: z.string().trim().min(2).max(280),
  flavor_slug: z.string().max(60).nullable().optional(),
  sticker: z.enum(COMMENT_STICKERS).default("heart"),
  rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  locale: z.string().max(5).nullable().optional(),
  /** a reply to this comment */
  parent_id: z.string().uuid().nullable().optional(),
  /** honeypot: real people never see this field */
  website: z.string().max(0).optional(),
  /** ms the form was open; bots submit instantly */
  elapsed: z.coerce.number().min(2500),
});

const MAX_PENDING = 30; // a queue cap so a spam wave can't flood the owner
const recent = new Map<string, number[]>(); // per-IP throttle (best effort, per server instance)

/**
 * A visitor leaves a comment (JSON, or multipart with a photo). Happy ones (4–5★, and replies) are read by a free AI
 * — text and photo — and go up at once if they are fine; everything else (1–3★ = private feedback, or anything the AI
 * is unsure about) waits for the owner, who gets it on Telegram either way.
 */
export async function POST(req: Request) {
  let raw: Record<string, unknown> | null;
  let file: File | null = null;
  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return Response.json({ ok: false }, { status: 400 });
    const f = form.get("photo");
    file = f instanceof File && f.size ? f : null;
    raw = Object.fromEntries([...form.entries()].filter(([k, v]) => k !== "photo" && typeof v === "string" && v !== "").map(([k, v]) => [k, v === "null" ? null : v]));
  } else raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const d = parsed.data;
  if (/https?:\/\/|www\./i.test(d.message + d.name)) return Response.json({ ok: false, error: "links" }, { status: 400 });
  if (file && file.size > 12 * 1024 * 1024) return Response.json({ ok: false, error: "big" }, { status: 413 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= 6) return Response.json({ ok: false, error: "slow-down" }, { status: 429 });
  recent.set(ip, [...hits, now]);

  const s = store();
  const all = await s.list("comments");
  if (all.filter((c) => c.status === "pending").length >= MAX_PENDING) return Response.json({ ok: false, error: "busy" }, { status: 503 });
  if (d.parent_id && !all.some((c) => c.id === d.parent_id && c.status === "approved")) return Response.json({ ok: false }, { status: 400 });

  const photo = file ? await saveImage(await file.arrayBuffer()) : null;
  const happy = Boolean(d.parent_id) || (d.rating ?? 0) >= 4;
  let ok = false;
  if (happy) {
    const look = photo ? `data:image/jpeg;base64,${(await jpegOf(photo.url, 512)).toString("base64")}` : null;
    ok = await moderate(d.message, look);
  }

  const row = {
    id: randomUUID(),
    name: d.name,
    message: d.message,
    flavor_slug: d.flavor_slug ?? null,
    sticker: d.sticker,
    rating: d.parent_id ? null : (d.rating ?? null),
    locale: d.locale ?? null,
    status: ok ? "approved" : "pending",
    created_at: new Date().toISOString(),
    photo_url: photo?.url ?? null,
    likes: 0,
    parent_id: d.parent_id ?? null,
  };
  await saveComment(row);
  // after the answer: tell the owner, translate it for the other visitors, refresh the cached page
  after(async () => {
    await notifyComment({ ...row, published: ok });
    if (ok) {
      await translateComment(row.id);
      await refreshSiteCache();
    }
  });
  return Response.json({ ok: true, published: ok });
}

/** More comments, older than `before` (the wall loads them a few at a time), with their replies. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const before = u.searchParams.get("before") ?? new Date(Date.now() + 60_000).toISOString();
  const limit = Math.min(30, Number(u.searchParams.get("limit")) || 12);
  const rows = ((await store().list("comments")) as { status: string; created_at: string; parent_id?: string | null; id: string }[]).filter((c) => c.status === "approved");
  const top = rows.filter((c) => !c.parent_id && c.created_at < before).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  const ids = new Set(top.map((c) => c.id));
  const replies = rows.filter((c) => c.parent_id && ids.has(c.parent_id));
  const strip = (r: Record<string, unknown>) => {
    const { updated_at: _u, ...rest } = r;
    return rest;
  };
  return Response.json({ comments: [...top, ...replies].map(strip), more: rows.filter((c) => !c.parent_id && c.created_at < (top.at(-1)?.created_at ?? before)).length > 0 }, { headers: { "cache-control": "no-store" } });
}

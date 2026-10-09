import { randomUUID } from "node:crypto";
import { z } from "zod";
import { notifyReservation } from "@/lib/bot/telegram";
import { notifyWhatsApp } from "@/lib/whatsapp";
import { store } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1).max(60),
  phone: z.string().trim().regex(/^[+\d][\d\s./-]{4,28}$/),
  items: z.string().trim().min(1).max(500),
  pickup_at: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(400).optional(),
  locale: z.string().max(5).optional(),
  /** honeypot: real people never see this field */
  website: z.string().max(0).optional(),
  /** ms the form was open; bots submit instantly */
  elapsed: z.number().min(2500),
});

const recent = new Map<string, number[]>(); // per-IP throttle (best effort, per server instance)

/**
 * A visitor pre-orders (gelato by the kilo, a tub, treats) for a pickup time. Stored as "new" and sent to the owner
 * on Telegram (✅ / ❌ buttons) and, if configured, WhatsApp via CallMeBot. The visitor's phone is kept only for this.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const d = parsed.data;
  const pickup = new Date(d.pickup_at);
  if (pickup.getTime() < Date.now() + 30 * 60_000 || pickup.getTime() > Date.now() + 60 * 86_400_000) return Response.json({ ok: false, error: "time" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= 4) return Response.json({ ok: false, error: "slow-down" }, { status: 429 });
  recent.set(ip, [...hits, now]);

  const row = { id: randomUUID(), name: d.name, phone: d.phone, items: d.items, pickup_at: pickup.toISOString(), notes: d.notes || null, locale: d.locale ?? null, status: "new", created_at: new Date().toISOString() };
  await store().put("reservations", row);

  const when = pickup.toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const text = `🍨 Nuova prenotazione\n\n${d.items}\n\n🕒 Ritiro: ${when}\n👤 ${d.name} · 📞 ${d.phone}${d.notes ? `\n📝 ${d.notes}` : ""}`;
  await Promise.all([notifyReservation(text, row.id), notifyWhatsApp(text)]);
  return Response.json({ ok: true });
}

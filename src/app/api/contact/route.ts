import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { notifyMessage } from "@/lib/bot/telegram";
import { compatChat } from "@/lib/llm";
import { saveContact } from "@/lib/mail";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(120),
  message: z.string().trim().min(2).max(1500),
  locale: z.string().max(5).optional(),
  /** honeypot: real people never see this field */
  website: z.string().max(0).optional(),
  /** ms the form was open; bots submit instantly */
  elapsed: z.number().min(2500),
});

const recent = new Map<string, number[]>(); // per-IP throttle (best effort, per server instance)

/** The visitor's words in Italian for the owner (as they are, if they already are Italian or nothing answers). */
async function toItalian(text: string, lang: string) {
  if (lang === "it") return text;
  try {
    const r = await compatChat({
      maxTokens: 700,
      deadline: 25_000,
      messages: [
        { role: "system", content: "Translate the customer's message to natural Italian for the owner of a gelateria. Keep names, numbers, dates and times exactly. Reply with the translation only." },
        { role: "user", content: text },
      ],
    });
    return r.message.content?.trim() || text;
  } catch {
    return text;
  }
}

/**
 * A visitor writes to the shop from the contact card, in any language. The owner gets it on Telegram in Italian
 * (with the original) and answers in Italian, written or by voice: the answer goes back by e-mail in the visitor's
 * language (see the "ms" button in lib/bot/telegram.ts). The address is kept in the private contacts table.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const d = parsed.data;
  if (/https?:\/\/|www\./i.test(d.name)) return Response.json({ ok: false }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= 5) return Response.json({ ok: false, error: "slow-down" }, { status: 429 });
  recent.set(ip, [...hits, now]);

  const id = randomUUID();
  const lang = d.locale ?? "it";
  await saveContact({ ref_id: id, kind: "message", email: d.email, name: d.name, lang, note: d.message });
  // after the answer: translate and tell the owner
  after(async () => {
    const italian = await toItalian(d.message, lang);
    await notifyMessage({ id, name: d.name, email: d.email, lang, original: d.message, italian });
  });
  return Response.json({ ok: true });
}

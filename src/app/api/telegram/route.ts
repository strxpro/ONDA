import { after } from "next/server";
import type { Update } from "grammy/types";
import { getBot } from "@/lib/bot/telegram";
import { siteUrl } from "@/lib/env";
import { consumeDirty } from "@/lib/mutations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** update_ids already taken on this instance — Telegram re-sends an update when it gets no quick 200 */
const seen = new Set<number>();

/**
 * Telegram webhook. Answers 200 at once and does the work after the response (AI, transcription, uploads can take
 * longer than Telegram waits — a slow answer made Telegram retry and the bot reply twice or loop).
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return new Response("TELEGRAM_WEBHOOK_SECRET not set", { status: 500 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== secret) return new Response("Unauthorized", { status: 401 });
  const update = (await req.json().catch(() => null)) as Update | null;
  if (!update?.update_id) return new Response("ok");
  if (seen.has(update.update_id)) return new Response("ok");
  seen.add(update.update_id);
  if (seen.size > 500) seen.delete(seen.values().next().value!);

  after(async () => {
    try {
      const bot = getBot();
      if (!bot.isInited()) await bot.init();
      await bot.handleUpdate(update);
    } catch (e) {
      console.error("[telegram] update", update.update_id, e);
    }
    // the website changed: refresh its cache in a request of its own (so a reload shows it at once)
    if (consumeDirty()) {
      const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : siteUrl;
      await fetch(`${base}/api/revalidate`, { method: "POST", headers: { "x-revalidate-secret": secret } }).catch((e) => console.error("[telegram] revalidate", e));
    }
  });
  return new Response("ok");
}

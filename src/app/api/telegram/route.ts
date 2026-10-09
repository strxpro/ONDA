import { webhookCallback } from "grammy";
import { getBot } from "@/lib/bot/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Telegram webhook. grammY rejects requests without the right X-Telegram-Bot-Api-Secret-Token. */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return new Response("TELEGRAM_WEBHOOK_SECRET not set", { status: 500 });
  const handler = webhookCallback(getBot(), "std/http", { secretToken: secret, timeoutMilliseconds: 55_000 });
  return handler(req);
}

import { createHash } from "node:crypto";
import { z } from "zod";
import { store } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({ path: z.string().max(300), referrer: z.string().max(500).nullable().optional(), locale: z.string().max(5).nullable().optional() });

function device(ua: string) {
  if (/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(ua)) return "bot";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return ua ? "desktop" : "unknown";
}

/**
 * Cookieless page view: visitor_hash = sha256(daily salt + IP + UA). The salt changes every day,
 * so the same visitor can't be followed across days, and the raw IP/UA are never stored.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const ua = req.headers.get("user-agent") ?? "";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_SALT ?? "onda-dev-salt";
  const visitor_hash = createHash("sha256").update(`${salt}:${day}:${ip}:${ua}`).digest("hex").slice(0, 32);
  let referrer: string | null = null;
  try {
    referrer = parsed.data.referrer ? new URL(parsed.data.referrer).hostname : null;
  } catch {}
  await store().addPageView({
    path: parsed.data.path,
    visitor_hash,
    referrer,
    country: req.headers.get("x-vercel-ip-country"),
    device: device(ua),
    locale: parsed.data.locale ?? null,
  });
  return new Response(null, { status: 204 });
}

import { revalidateTag } from "next/cache";
import { SITE_TAG } from "@/lib/data";

export const runtime = "nodejs";

/** Refresh the cached site data after a change made straight in the database (secret: TELEGRAM_WEBHOOK_SECRET). */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) return new Response("Unauthorized", { status: 401 });
  revalidateTag(SITE_TAG);
  return Response.json({ ok: true });
}

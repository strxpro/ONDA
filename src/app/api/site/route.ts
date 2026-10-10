import { store } from "@/lib/store";
import { DEFAULT_MOTION } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The public site data, fresh from the database — the page re-reads it after every live change. */
export async function GET() {
  const data = await store().readAll();
  return Response.json({ ...data, settings: { ...data.settings, motion: { ...DEFAULT_MOTION, ...data.settings.motion } } }, { headers: { "cache-control": "no-store" } });
}

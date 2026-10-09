import { store } from "@/lib/store";
import type { Reservation } from "@/lib/types";

export const runtime = "nodejs";
export const revalidate = 600;

const MIN_G = 250;
const MAX_G = 3000;
const STEP = 250;

/** Which weights people actually pre-order: counts per 250 g step (no names, no phones — just weights). */
export async function GET() {
  const buckets = Array.from({ length: (MAX_G - MIN_G) / STEP + 1 }, () => 0);
  try {
    for (const r of (await store().list("reservations")) as Reservation[]) {
      const kg = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(r.items);
      const g = kg ? parseFloat(kg[1].replace(",", ".")) * 1000 : Number(/(\d+)\s*g\b/i.exec(r.items)?.[1] ?? NaN);
      if (!Number.isFinite(g)) continue;
      buckets[Math.round((Math.min(MAX_G, Math.max(MIN_G, g)) - MIN_G) / STEP)]++;
    }
  } catch {
    // table not there yet: no data
  }
  return Response.json({ min: MIN_G, step: STEP, buckets, total: buckets.reduce((a, b) => a + b, 0) }, { headers: { "cache-control": "public, s-maxage=600" } });
}

import "server-only";

import { createRow, newBatch, patchRow } from "./mutations";
import { store, type Actor, type Row } from "./store";

/**
 * Pulls the real rating, review count and the latest reviews from Google Places API (New).
 * Needs GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID. Google returns at most 5 reviews.
 */
export const hasGoogle = Boolean(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACE_ID);

type GReview = {
  name: string;
  rating: number;
  text?: { text: string; languageCode?: string };
  originalText?: { text: string; languageCode?: string };
  authorAttribution?: { displayName?: string };
  publishTime?: string;
  googleMapsUri?: string;
};

export async function syncGoogleReviews(actor: Actor) {
  if (!hasGoogle) throw new Error("GOOGLE_PLACES_API_KEY / GOOGLE_PLACE_ID mancanti");
  const res = await fetch(`https://places.googleapis.com/v1/places/${process.env.GOOGLE_PLACE_ID}`, {
    headers: {
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri,reviews",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Places: ${res.status} ${await res.text()}`);
  const place = (await res.json()) as { rating?: number; userRatingCount?: number; googleMapsUri?: string; reviews?: GReview[] };

  const batchId = newBatch();
  const ctx = { ...actor, action: "sync_google_reviews", batchId };
  await patchRow("site_settings", 1, {
    ...(place.rating ? { rating_google: Math.round(place.rating * 10) / 10 } : {}),
    ...(place.userRatingCount ? { rating_google_count: place.userRatingCount } : {}),
    ...(place.googleMapsUri ? { rating_google_url: place.googleMapsUri } : {}),
  }, ctx);

  const existing = (await store().list("reviews")) as Row[];
  let added = 0;
  for (const [i, r] of (place.reviews ?? []).entries()) {
    const text = r.originalText?.text ?? r.text?.text;
    if (!text) continue;
    const found = existing.find((e) => e.url === r.googleMapsUri || (e.author === r.authorAttribution?.displayName && e.source === "google"));
    const row = {
      source: "google",
      author: r.authorAttribution?.displayName ?? "Google",
      rating: r.rating,
      text,
      language: r.originalText?.languageCode ?? r.text?.languageCode ?? null,
      review_date: r.publishTime?.slice(0, 10) ?? null,
      url: r.googleMapsUri ?? null,
      is_visible: found ? found.is_visible : r.rating >= 4,
      sort_order: found ? found.sort_order : (i + 1) * 10,
    };
    if (found) await patchRow("reviews", found.id as string, row, ctx);
    else {
      await createRow("reviews", row, ctx);
      added++;
    }
  }
  return { rating: place.rating, count: place.userRatingCount, added };
}

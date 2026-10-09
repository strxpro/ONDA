export const runtime = "nodejs";
export const revalidate = 86400;

/**
 * The shop's main photo from its Google Business Profile (Places API New), with the author credit Google requires.
 * Needs GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID; without them it answers 404 and the site shows its own photo.
 *   GET /api/place-photo        → { url, author, authorUrl }
 */
export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const place = process.env.GOOGLE_PLACE_ID;
  if (!key || !place) return Response.json({ error: "not configured" }, { status: 404 });
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${place}`, { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "photos" }, next: { revalidate: 86400 } });
    const data = (await res.json()) as { photos?: { name: string; authorAttributions?: { displayName?: string; uri?: string }[] }[] };
    const photo = data.photos?.[0];
    if (!photo) return Response.json({ error: "no photo" }, { status: 404 });
    const media = await fetch(`https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1200&skipHttpRedirect=true&key=${key}`, { next: { revalidate: 86400 } });
    const { photoUri } = (await media.json()) as { photoUri?: string };
    if (!photoUri) return Response.json({ error: "no photo" }, { status: 404 });
    const a = photo.authorAttributions?.[0];
    return Response.json({ url: photoUri, author: a?.displayName ?? null, authorUrl: a?.uri ?? null }, { headers: { "cache-control": "public, s-maxage=86400" } });
  } catch {
    return Response.json({ error: "google" }, { status: 502 });
  }
}

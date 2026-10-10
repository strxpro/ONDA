import "server-only";

import { createHash } from "node:crypto";
import { siteUrl } from "./env";
import { compatChat, describeImage } from "./llm";
import { patchRow } from "./mutations";
import { rank } from "./fuzzy";
import { store, type Actor } from "./store";

/**
 * Every photo on the website the owner may want to swap — the Lab gallery, the treats, flavors with their own
 * photo — with what it SHOWS (written once by a model that sees images, kept in settings as texts["seen:<hash>"]),
 * so "the one with the blue background" can be found in any language.
 */
export type PhotoRef = { kind: "gallery" | "item" | "flavor"; id: string; url: string; label: string };

export const absUrl = (u: string) => (u.startsWith("http") ? u : `${siteUrl}${u.startsWith("/") ? "" : "/"}${u}`);
const seenKey = (url: string) => `seen:${createHash("sha1").update(url).digest("hex").slice(0, 16)}`;

export async function allPhotos(): Promise<PhotoRef[]> {
  const [gallery, items, flavors] = await Promise.all([store().list("gallery"), store().list("price_items"), store().list("flavors")]);
  const g = (gallery as { id: string; image_url: string; sort_order: number }[]).sort((a, b) => a.sort_order - b.sort_order);
  return [
    ...g.map((x, i) => ({ kind: "gallery" as const, id: x.id, url: x.image_url, label: `Laboratorio n. ${i + 1}` })),
    ...(items as { id: string; image_url: string | null; is_active: boolean; label: Record<string, string> }[]).filter((p) => p.image_url && p.is_active).map((p) => ({ kind: "item" as const, id: p.id, url: p.image_url!, label: p.label.it })),
    ...(flavors as { id: string; image_url: string | null; deleted_at: string | null; name: Record<string, string> }[]).filter((f) => f.image_url && !f.deleted_at).map((f) => ({ kind: "flavor" as const, id: f.id, url: f.image_url!, label: `gusto ${f.name.it}` })),
  ];
}

/** Small JPEG of any photo (Telegram and the vision models both like it; our photos are WebP). */
export async function jpegOf(url: string, size = 768) {
  const res = await fetch(absUrl(url), { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`photo ${res.status}`);
  const { default: sharp } = await import("sharp");
  return sharp(Buffer.from(await res.arrayBuffer())).rotate().resize({ width: size, height: size, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
}

async function texts() {
  const st = (await store().get("site_settings", 1)) as { texts: Record<string, { it?: string }> } | null;
  return st?.texts ?? {};
}

/** What each photo shows; the ones never seen are looked at now (a few at a time, so the free models keep up). */
export async function describeAll(refs: PhotoRef[], max = 3): Promise<Map<string, string>> {
  const t = await texts();
  const out = new Map<string, string>();
  const missing: PhotoRef[] = [];
  for (const r of refs) {
    const d = t[seenKey(r.url)]?.it;
    if (d) out.set(r.url, d);
    else missing.push(r);
  }
  const fresh: Record<string, { it: string }> = {};
  for (const r of missing.slice(0, max)) {
    const d = await describe(r.url);
    if (d) {
      out.set(r.url, d);
      fresh[seenKey(r.url)] = { it: d };
    }
  }
  if (Object.keys(fresh).length) await rememberSeen(fresh);
  return out;
}

async function describe(url: string) {
  try {
    const jpg = await jpegOf(url, 384);
    return await describeImage(`data:image/jpeg;base64,${jpg.toString("base64")}`);
  } catch {
    return null;
  }
}

async function rememberSeen(fresh: Record<string, { it: string }>) {
  const t = await texts();
  await patchRow("site_settings", 1, { texts: { ...t, ...fresh } }, { actor: "ai", source: "system", action: "photo_seen" }).catch(() => {});
}

/** Look at a new photo right away (after it is uploaded), so it can be found later. */
export async function seeNewPhoto(url: string) {
  const d = await describe(url);
  if (d) await rememberSeen({ [seenKey(url)]: { it: d } });
}

/**
 * The photos that match the owner's words ("niebieskie tło", "the boy with the cone", "foto 3"), best first.
 * A model reads the list of descriptions (any language in, any language out); plain word matching as a fallback.
 */
export async function findPhotos(query: string, limit = 4): Promise<PhotoRef[]> {
  const refs = await allPhotos();
  const q = query.trim();
  if (!q) return refs;
  const n = /(?:^|\D)(\d{1,2})(?:\D|$)/.exec(q)?.[1];
  if (n && /^(?:n\.?|nr\.?|numer|number|numero|foto|photo|zdj\S*)?\s*\d{1,2}$/i.test(q)) {
    const g = refs.filter((r) => r.kind === "gallery")[Number(n) - 1];
    if (g) return [g];
  }
  const seen = await describeAll(refs);
  const lines = refs.map((r, i) => `${i + 1}. [${r.label}] ${seen.get(r.url) ?? "(not described)"}`).join("\n");
  try {
    const r = await compatChat({
      json: true,
      maxTokens: 120,
      deadline: 30_000,
      messages: [
        { role: "system", content: 'You match a request (any language) to photos by their descriptions. Answer JSON {"matches":[numbers]} with the best matches first (max 4, only plausible ones; [] if none).' },
        { role: "user", content: `Request: ${q}\n\nPhotos:\n${lines}` },
      ],
    });
    const nums = (JSON.parse(r.message.content ?? "{}") as { matches?: number[] }).matches ?? [];
    const hits = nums.map((i) => refs[i - 1]).filter(Boolean);
    if (hits.length) return hits.slice(0, limit);
  } catch {
    /* fall through to word matching */
  }
  return rank(q, refs, (r) => [r.label, seen.get(r.url) ?? ""])
    .filter((x) => x.score > 0.2)
    .slice(0, limit)
    .map((x) => x.item);
}

/** Put the new photo where the old one was. */
export async function replacePhoto(ref: PhotoRef, photo: { url: string; width?: number; height?: number }, actor: Actor) {
  const ctx = { ...actor, action: "replace_photo" };
  if (ref.kind === "gallery") await patchRow("gallery", ref.id, { image_url: photo.url, width: photo.width ?? null, height: photo.height ?? null }, ctx);
  else if (ref.kind === "item") await patchRow("price_items", ref.id, { image_url: photo.url }, ctx);
  else await patchRow("flavors", ref.id, { image_url: photo.url }, ctx);
  await seeNewPhoto(photo.url).catch(() => {});
}

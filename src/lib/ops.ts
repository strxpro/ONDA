import "server-only";

import { flavorLook, translate } from "./ai";
import { rank } from "./fuzzy";
import { createRow, deleteRow, newBatch, patchRow, type Ctx } from "./mutations";
import { store, type Actor, type Row } from "./store";
import { nowIn } from "./hours";
import { LOCALES, MotionSettings, type Announcement, type Comment, type Flavor, type I18nText, type PriceItem, type SectionKey } from "./types";

/**
 * High-level shop operations, shared by the Telegram bot and the admin quick actions.
 * Each one is a single undoable step (one audit batch).
 */

const names = (t: Partial<I18nText>) => LOCALES.map((l) => t[l] ?? "");

export async function allFlavors(includeDeleted = false) {
  const rows = (await store().list("flavors")) as Flavor[];
  return rows.filter((f) => includeDeleted || !f.deleted_at).sort((a, b) => a.sort_order - b.sort_order);
}
export async function allPrices() {
  return ((await store().list("price_items")) as PriceItem[]).sort((a, b) => a.sort_order - b.sort_order);
}

export type Match<T> = { item: T; score: number; alternatives: T[] } | null;

/** Best fuzzy match; `alternatives` are close runners-up for a clarifying question. */
export async function findFlavor(query: string, includeDeleted = false): Promise<Match<Flavor>> {
  const ranked = rank(query, await allFlavors(includeDeleted), (f) => [f.slug.replace(/-/g, " "), ...names(f.name)]);
  if (!ranked.length || ranked[0].score < 0.55) return null;
  return { item: ranked[0].item, score: ranked[0].score, alternatives: ranked.slice(1).filter((r) => r.score > ranked[0].score - 0.08 && r.score >= 0.55).map((r) => r.item) };
}

export async function findPrice(query: string): Promise<Match<PriceItem>> {
  const ranked = rank(query, await allPrices(), (p) => [p.slug.replace(/-/g, " "), ...names(p.label), `${p.price_group} ${p.size ?? ""}`]);
  if (!ranked.length || ranked[0].score < 0.5) return null;
  return { item: ranked[0].item, score: ranked[0].score, alternatives: ranked.slice(1).filter((r) => r.score > ranked[0].score - 0.06 && r.score >= 0.5).map((r) => r.item) };
}

const ctx = (actor: Actor, action: string, batchId = newBatch()): Ctx => ({ ...actor, action, batchId });

export async function setFlavorAvailability(id: string, available: boolean, actor: Actor) {
  return patchRow("flavors", id, { is_available_today: available }, ctx(actor, "set_flavor_availability"));
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export type NewFlavor = { name: string; description?: string; ingredients?: string; color?: string; tags?: Flavor["tags"]; category?: Flavor["category"]; featured?: boolean; photo?: string };

/** Add a flavor: translates name/description, picks a realistic color, marks it "new". */
export async function addFlavor(input: NewFlavor, actor: Actor, batchId = newBatch()) {
  const existing = await findFlavor(input.name, true);
  if (existing && existing.score > 0.92) {
    // It existed before (maybe soft-deleted): bring it back instead of duplicating.
    return patchRow("flavors", existing.item.id, { deleted_at: null, is_available_today: true }, ctx(actor, "add_flavor", batchId));
  }
  const [tr, look] = await Promise.all([translate({ name: input.name, ...(input.description ? { description: input.description } : {}), ...(input.ingredients ? { ingredients: input.ingredients } : {}) }), flavorLook(input.name, input.description)]);
  const all = await allFlavors(true);
  let slug = slugify(input.name) || "gusto";
  if (all.some((f) => f.slug === slug)) slug = `${slug}-${all.length + 1}`;
  const tags = Array.from(new Set([...(input.tags ?? []), "new" as const]));
  return createRow(
    "flavors",
    {
      slug,
      name: tr.name,
      description: tr.description ?? {},
      ingredients: tr.ingredients ?? {},
      color_primary: input.color && /^#[0-9a-f]{6}$/i.test(input.color) ? input.color : look.color_primary,
      color_secondary: look.color_secondary,
      category: input.category ?? look.category,
      tags,
      is_available_today: true,
      is_featured: input.featured ?? false,
      sort_order: Math.max(0, ...all.map((f) => f.sort_order)) + 10,
      image_url: input.photo ?? null,
      scoop_texture: look.scoop_texture,
      deleted_at: null,
    },
    ctx(actor, "add_flavor", batchId),
  );
}

export async function updateFlavor(id: string, fields: Partial<Flavor> & { name_text?: string; description_text?: string; ingredients_text?: string }, actor: Actor) {
  const { name_text, description_text, ingredients_text, ...rest } = fields;
  const patch: Row = { ...rest };
  if (name_text || description_text || ingredients_text) {
    const tr = await translate({ ...(name_text ? { name: name_text } : {}), ...(description_text ? { description: description_text } : {}), ...(ingredients_text ? { ingredients: ingredients_text } : {}) });
    if (tr.name) patch.name = tr.name;
    if (tr.description) patch.description = tr.description;
    if (tr.ingredients) patch.ingredients = tr.ingredients;
  }
  return patchRow("flavors", id, patch, ctx(actor, "update_flavor"));
}

/** The "gusto firma" shown in the big Signature section: exactly one flavor carries the "signature" tag. */
export async function setSignatureFlavor(id: string, actor: Actor) {
  const batchId = newBatch();
  const c = { ...actor, action: "set_signature_flavor", batchId };
  for (const f of await allFlavors()) {
    const has = f.tags.includes("signature");
    if (f.id === id && !has) await patchRow("flavors", f.id, { tags: [...f.tags, "signature"], is_featured: true }, c);
    if (f.id !== id && has) await patchRow("flavors", f.id, { tags: f.tags.filter((t) => t !== "signature") }, c);
  }
}

export async function removeFlavor(id: string, actor: Actor) {
  return deleteRow("flavors", id, ctx(actor, "remove_flavor"));
}

/** "Today's flavors are: …" — everything else becomes unavailable; unknown names are added. */
export async function replaceTodayFlavors(list: string[], actor: Actor) {
  const batchId = newBatch();
  const flavors = await allFlavors(true);
  const wanted = new Set<string>();
  const added: string[] = [];
  for (const name of list) {
    const m = await findFlavor(name, true);
    if (m && m.score >= 0.75) wanted.add(m.item.id);
    else {
      const f = (await addFlavor({ name }, actor, batchId)) as Flavor | null;
      if (f) {
        wanted.add(f.id);
        added.push(name);
      }
    }
  }
  for (const f of flavors) {
    const on = wanted.has(f.id);
    if (on && f.deleted_at) await patchRow("flavors", f.id, { deleted_at: null, is_available_today: true }, ctx(actor, "replace_today_flavors", batchId));
    else if (f.is_available_today !== on && !f.deleted_at) await patchRow("flavors", f.id, { is_available_today: on }, ctx(actor, "replace_today_flavors", batchId));
  }
  return { available: wanted.size, added };
}

export async function updatePrice(id: string, price: number, actor: Actor) {
  return patchRow("price_items", id, { price_eur: Math.round(price * 100) / 100 }, ctx(actor, "update_price"));
}

/** Hours for a weekday (1–7) or a specific date (special day). */
export async function setHours(input: { weekday?: number; date?: string; open?: string; close?: string; closed?: boolean; note?: string }, actor: Actor) {
  const c = ctx(actor, "set_hours");
  if (input.date) {
    const existing = (await store().get("special_days", input.date)) as Row | null;
    const base = existing ?? { date: input.date, note: {}, open_time: null, close_time: null, is_closed: false };
    // a special day that only changes closing time keeps the usual opening time
    const weekday = new Date(`${input.date}T12:00:00Z`).getUTCDay() || 7;
    const usual = (await store().get("opening_hours", weekday)) as Row | null;
    const note = input.note ? (await translate({ note: input.note })).note : base.note;
    const row = {
      ...base,
      note,
      is_closed: Boolean(input.closed),
      open_time: input.closed ? null : (input.open ?? base.open_time ?? usual?.open_time ?? "10:30"),
      close_time: input.closed ? null : (input.close ?? base.close_time ?? usual?.close_time ?? "22:30"),
    };
    return existing ? patchRow("special_days", input.date, row, c) : createRow("special_days", row, c);
  }
  if (!input.weekday) throw new Error("weekday or date required");
  const cur = (await store().get("opening_hours", input.weekday)) as Row;
  return patchRow(
    "opening_hours",
    input.weekday,
    { is_closed: Boolean(input.closed), open_time: input.closed ? cur.open_time : (input.open ?? cur.open_time), close_time: input.closed ? cur.close_time : (input.close ?? cur.close_time) },
    c,
  );
}

export async function setBanner(input: { text: string; until?: string; color?: string }, actor: Actor) {
  const batchId = newBatch();
  for (const a of (await store().list("announcements")) as Announcement[]) {
    if (a.is_active) await patchRow("announcements", a.id, { is_active: false }, ctx(actor, "set_banner", batchId));
  }
  const tr = await translate({ text: input.text });
  return createRow(
    "announcements",
    { text: tr.text, color: input.color ?? "#FFE066", starts_at: new Date().toISOString(), ends_at: input.until ?? null, is_active: true },
    ctx(actor, "set_banner", batchId),
  );
}

export async function clearBanner(actor: Actor) {
  const batchId = newBatch();
  let n = 0;
  for (const a of (await store().list("announcements")) as Announcement[]) {
    if (a.is_active) {
      await patchRow("announcements", a.id, { is_active: false }, ctx(actor, "clear_banner", batchId));
      n++;
    }
  }
  return n;
}

export async function toggleSection(key: SectionKey, visible: boolean, actor: Actor) {
  return patchRow("sections", key, { is_visible: visible }, ctx(actor, "toggle_section"));
}

export async function setMotion(patch: Partial<MotionSettings>, actor: Actor) {
  const s = (await store().get("site_settings", 1)) as Row;
  const motion = MotionSettings.parse({ ...(s.motion as object), ...patch });
  return patchRow("site_settings", 1, { motion }, ctx(actor, "set_motion"));
}

export async function setText(key: string, text: string, actor: Actor) {
  const s = (await store().get("site_settings", 1)) as Row;
  const tr = await translate({ v: text });
  return patchRow("site_settings", 1, { texts: { ...(s.texts as object), [key]: tr.v } }, ctx(actor, "set_text"));
}

/* ─── menu items ("Altre delizie", tubs, extras) ──────────────────────────── */

/** Add a menu item (e.g. a new treat), translated into the 6 languages. Price 0 = no price shown. */
export async function addMenuItem(input: { name: string; description?: string; ingredients?: string; price?: number; group?: PriceItem["price_group"]; photo?: string }, actor: Actor) {
  const tr = await translate({ name: input.name, ...(input.description ? { description: input.description } : {}), ...(input.ingredients ? { ingredients: input.ingredients } : {}) });
  const all = await allPrices();
  let slug = slugify(input.name) || "voce";
  if (all.some((p) => p.slug === slug)) slug = `${slug}-${all.length + 1}`;
  return createRow(
    "price_items",
    {
      slug,
      label: tr.name,
      price_group: input.group ?? "delizie",
      size: null,
      max_scoops: null,
      price_eur: Math.round((input.price ?? 0) * 100) / 100,
      sort_order: Math.max(0, ...all.map((p) => p.sort_order)) + 10,
      is_active: true,
      image_url: input.photo ?? null,
      description: tr.description ?? null,
      ...(tr.ingredients ? { ingredients: tr.ingredients } : {}),
    },
    ctx(actor, "add_menu_item"),
  );
}

export async function updateMenuItem(id: string, fields: { name?: string; description?: string; ingredients?: string; visible?: boolean; photo?: string }, actor: Actor) {
  const tr = await translate({ ...(fields.name ? { name: fields.name } : {}), ...(fields.description ? { description: fields.description } : {}), ...(fields.ingredients ? { ingredients: fields.ingredients } : {}) });
  const patch: Row = {};
  if (tr.name) patch.label = tr.name;
  if (tr.description) patch.description = tr.description;
  if (tr.ingredients) patch.ingredients = tr.ingredients;
  if (fields.visible != null) patch.is_active = fields.visible;
  if (fields.photo) patch.image_url = fields.photo;
  return patchRow("price_items", id, patch, ctx(actor, "update_menu_item"));
}

/* ─── photos ─────────────────────────────────────────────────────────────── */

/** Swap one gallery photo for a new one: by position (1 = first shown), else the oldest. */
export async function replaceGalleryPhoto(input: { url: string; width?: number; height?: number; position?: number; caption?: string }, actor: Actor) {
  const all = ((await store().list("gallery")) as { id: string; sort_order: number }[]).sort((a, b) => a.sort_order - b.sort_order);
  if (!all.length) return addGalleryPhoto(input, actor);
  const target = input.position && all[input.position - 1] ? all[input.position - 1] : all[all.length - 1];
  const tr = input.caption ? await translate({ alt: input.caption }) : {};
  return patchRow("gallery", target.id, { image_url: input.url, width: input.width ?? null, height: input.height ?? null, ...(tr.alt ? { alt: tr.alt } : {}) }, ctx(actor, "replace_gallery_photo"));
}

export async function addGalleryPhoto(input: { url: string; caption?: string; width?: number; height?: number }, actor: Actor) {
  const tr = input.caption ? await translate({ alt: input.caption }) : {};
  const all = (await store().list("gallery")) as { sort_order: number }[];
  return createRow(
    "gallery",
    { image_url: input.url, width: input.width ?? null, height: input.height ?? null, alt: tr.alt ?? {}, color: "#FF8FB8", sort_order: Math.min(0, ...all.map((g) => g.sort_order)) - 10 },
    ctx(actor, "add_gallery_photo"),
  );
}

/* ─── visitors' comments ─────────────────────────────────────────────────── */

export async function pendingComments() {
  return ((await store().list("comments")) as Comment[]).filter((c) => c.status === "pending").sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function moderateComment(id: string, approve: boolean, actor: Actor) {
  return patchRow("comments", id, { status: approve ? "approved" : "rejected" }, ctx(actor, approve ? "comment_approved" : "comment_rejected"));
}

/** Convert "today"/"yesterday"/"7d"/"30d" into a [from, to) range in the shop's timezone. */
export function periodRange(period: "today" | "yesterday" | "7d" | "30d", timeZone = "Europe/Rome") {
  const n = nowIn(timeZone);
  // midnight in the shop's timezone, expressed as a UTC instant
  const midnight = new Date(Date.now() - n.minutes * 60_000);
  midnight.setUTCSeconds(0, 0);
  const day = 86_400_000;
  switch (period) {
    case "today":
      return { from: midnight, to: new Date(Date.now() + 60_000) };
    case "yesterday":
      return { from: new Date(midnight.getTime() - day), to: midnight };
    case "7d":
      return { from: new Date(midnight.getTime() - 6 * day), to: new Date(Date.now() + 60_000) };
    case "30d":
      return { from: new Date(midnight.getTime() - 29 * day), to: new Date(Date.now() + 60_000) };
  }
}

export async function getStats(period: "today" | "yesterday" | "7d" | "30d") {
  const { from, to } = periodRange(period);
  return store().stats(from, to);
}

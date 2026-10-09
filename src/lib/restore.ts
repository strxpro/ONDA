import "server-only";

import { seed } from "@/content/seed";
import { createRow, deleteRow, newBatch, patchRow } from "./mutations";
import { PK, store, type Actor, type Row, type TableName } from "./store";

/** What can be put back as it was on day one. Comments, reviews, reservations and photos the owner uploaded stay. */
export const RESTORE_PARTS = ["flavors", "prices", "hours", "texts", "sections", "motion"] as const;
export type RestorePart = (typeof RESTORE_PARTS)[number];
export const RESTORE_LABEL: Record<RestorePart, string> = {
  flavors: "Gusti",
  prices: "Prezzi",
  hours: "Orari e giorni speciali",
  texts: "Testi e banner",
  sections: "Sezioni del sito",
  motion: "Animazioni",
};

const same = (a: Row, b: Row) => Object.keys(b).every((k) => JSON.stringify(a[k] ?? null) === JSON.stringify(b[k] ?? null));

/** Make a table hold exactly the seed rows: changed rows go back, missing ones return, extra ones are removed. */
async function resetTable(table: TableName, rows: Row[], ctx: Parameters<typeof createRow>[2]) {
  const pk = PK[table];
  const current = (await store().list(table)) as Row[];
  const wanted = new Set(rows.map((r) => String(r[pk])));
  let changed = 0;
  for (const r of rows) {
    const now = current.find((c) => String(c[pk]) === String(r[pk]));
    const target = table === "flavors" ? { ...r, deleted_at: null } : r;
    if (now && same(now, target)) continue;
    await createRow(table, { ...(now ?? {}), ...target }, ctx);
    changed++;
  }
  for (const c of current) {
    if (wanted.has(String(c[pk]))) continue;
    if (table === "flavors" && c.deleted_at) continue;
    await deleteRow(table, c[pk] as string, ctx);
    changed++;
  }
  return changed;
}

/**
 * "Ripristina originale": puts the chosen parts of the site back to how they were delivered (the seed), as ONE
 * batch — so admin → Cronologia (or "annulla" to the bot) undoes the whole restore in one go.
 */
export async function restoreDefaults(parts: RestorePart[], actor: Actor) {
  const ctx = { ...actor, action: "restore_defaults", batchId: newBatch() };
  const all = parts.length ? parts : [...RESTORE_PARTS];
  let changed = 0;
  if (all.includes("flavors")) changed += await resetTable("flavors", seed.flavors as unknown as Row[], ctx);
  if (all.includes("prices")) changed += await resetTable("price_items", seed.prices as unknown as Row[], ctx);
  if (all.includes("hours")) {
    changed += await resetTable("opening_hours", seed.hours as unknown as Row[], ctx);
    changed += await resetTable("special_days", seed.specialDays as unknown as Row[], ctx);
  }
  if (all.includes("sections")) changed += await resetTable("sections", seed.sections as unknown as Row[], ctx);
  if (all.includes("texts") || all.includes("motion")) {
    const patch: Row = {};
    if (all.includes("texts")) Object.assign(patch, { name: seed.settings.name, tagline: seed.settings.tagline, texts: seed.settings.texts });
    if (all.includes("motion")) patch.motion = seed.settings.motion;
    await patchRow("site_settings", 1, patch, ctx);
    changed++;
  }
  if (all.includes("texts")) changed += await resetTable("announcements", seed.announcements as unknown as Row[], ctx);
  return { parts: all, changed };
}

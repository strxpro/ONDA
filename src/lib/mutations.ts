import "server-only";

import { revalidateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { SITE_TAG } from "./data";
import { emitChange } from "./events";
import { PK, store, type Actor, type AuditEntry, type Key, type Row, type TableName } from "./store";
import { Announcement, Comment, Flavor, GalleryImage, OpeningHours, PriceItem, Review, Section, SiteSettings, SpecialDay } from "./types";

/** Full-row validation per table; every write passes through it. */
const ROW_SCHEMA: Record<TableName, z.ZodType<Row>> = {
  site_settings: SiteSettings.extend({ id: z.literal(1) }),
  flavors: Flavor,
  price_items: PriceItem,
  opening_hours: OpeningHours,
  special_days: SpecialDay,
  announcements: Announcement,
  sections: Section,
  gallery: GalleryImage,
  reviews: Review,
  comments: Comment,
} as Record<TableName, z.ZodType<Row>>;

export type Ctx = Actor & { action: string; batchId?: string };

function publish(table: TableName, key: Key, row: Row | null) {
  emitChange({ table, key: String(key), row });
  try {
    revalidateTag(SITE_TAG);
  } catch {
    // outside a request scope (scripts): nothing cached to invalidate
  }
}

/** The one write primitive: validate → store → audit_log → live update. `next = null` deletes. */
async function write(table: TableName, key: Key, next: Row | null, ctx: Ctx): Promise<Row | null> {
  const s = store();
  const before = await s.get(table, key);
  let after: Row | null = null;
  if (next) {
    const valid = ROW_SCHEMA[table].parse(next);
    after = await s.put(table, valid);
  } else if (before) {
    await s.remove(table, key);
  }
  await s.addAudit({
    actor: ctx.actor,
    source: ctx.source,
    action: ctx.action,
    table_name: table,
    row_id: String(key),
    before,
    after,
    batch_id: ctx.batchId ?? null,
  });
  publish(table, key, after);
  return after;
}

export async function patchRow(table: TableName, key: Key, patch: Row, ctx: Ctx) {
  const before = await store().get(table, key);
  if (!before) throw new Error(`${table}: row ${key} not found`);
  return write(table, key, { ...before, ...patch, [PK[table]]: before[PK[table]] }, ctx);
}

export async function createRow(table: TableName, row: Row, ctx: Ctx) {
  const key = (row[PK[table]] as Key | undefined) ?? randomUUID();
  return write(table, key, { ...row, [PK[table]]: key }, ctx);
}

export async function deleteRow(table: TableName, key: Key, ctx: Ctx) {
  // Flavors are soft-deleted so they can come back (and their history stays readable).
  if (table === "flavors") return patchRow(table, key, { deleted_at: new Date().toISOString(), is_available_today: false }, ctx);
  return write(table, key, null, ctx);
}

/** Set sort_order from the given key order, as one undoable step. */
export async function reorder(table: TableName, keys: Key[], ctx: Ctx) {
  const batchId = randomUUID();
  for (const [i, key] of keys.entries()) {
    const row = await store().get(table, key);
    if (row && row.sort_order !== (i + 1) * 10) await patchRow(table, key, { sort_order: (i + 1) * 10 }, { ...ctx, batchId });
  }
}

/** Undo an audit entry (and everything in its batch) by restoring the "before" rows. */
export async function undo(auditId: number, actor: Actor): Promise<AuditEntry[]> {
  const s = store();
  const group = (await s.auditGroup(auditId)).filter((e) => !e.undone_at && e.action !== "undo");
  if (!group.length) return [];
  const batchId = randomUUID();
  // newest first, so chained changes on the same row unwind correctly
  for (const e of group.sort((a, b) => b.id - a.id)) {
    await write(e.table_name, e.row_id, e.before, { ...actor, action: "undo", batchId });
  }
  await s.markUndone(group.map((e) => e.id));
  return group;
}

/** Undo the most recent change that isn't itself an undo. */
export async function undoLast(actor: Actor) {
  const last = (await store().listAudit(50)).find((e) => !e.undone_at && e.action !== "undo");
  return last ? undo(last.id, actor) : [];
}

export const newBatch = () => randomUUID();

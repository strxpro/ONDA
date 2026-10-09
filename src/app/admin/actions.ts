"use server";

import { revalidatePath } from "next/cache";
import { translate } from "@/lib/ai";
import { requireAdminAction } from "@/lib/auth";
import { syncGoogleReviews } from "@/lib/google";
import { createRow, deleteRow, newBatch, patchRow, reorder, undo } from "@/lib/mutations";
import { addFlavor, getStats, type NewFlavor } from "@/lib/ops";
import { TABLES, type Key, type Row, type TableName } from "@/lib/store";
import { saveImage } from "@/lib/upload";

/** Every admin action returns { ok, error } so the UI can show a toast instead of crashing. */
type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    revalidatePath("/admin", "layout");
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.length > 300 ? msg.slice(0, 300) + "…" : msg };
  }
}

const table = (t: string) => {
  if (!TABLES.includes(t as TableName)) throw new Error(`Tabella non valida: ${t}`);
  return t as TableName;
};

export async function saveRow(t: string, key: Key, patch: Row) {
  return run(async () => patchRow(table(t), key, patch, { ...(await requireAdminAction()), action: `edit_${t}` }));
}

export async function createRowAction(t: string, row: Row) {
  return run(async () => createRow(table(t), row, { ...(await requireAdminAction()), action: `create_${t}` }));
}

export async function deleteRowAction(t: string, key: Key) {
  return run(async () => deleteRow(table(t), key, { ...(await requireAdminAction()), action: `delete_${t}` }));
}

export async function reorderAction(t: string, keys: Key[]) {
  return run(async () => reorder(table(t), keys, { ...(await requireAdminAction()), action: `reorder_${t}`, batchId: newBatch() }));
}

export async function undoAction(auditId: number) {
  return run(async () => (await undo(auditId, await requireAdminAction())).length);
}

export async function translateAction(text: string) {
  return run(async () => {
    await requireAdminAction();
    return (await translate({ v: text })).v;
  });
}

export async function addFlavorAction(input: NewFlavor) {
  return run(async () => addFlavor(input, await requireAdminAction()));
}

export async function statsAction(period: "today" | "yesterday" | "7d" | "30d") {
  return run(async () => {
    await requireAdminAction();
    return getStats(period);
  });
}

export async function syncGoogleAction() {
  return run(async () => syncGoogleReviews(await requireAdminAction()));
}

/** Upload → resized WebP (max 1600 px) → Supabase Storage, or public/uploads in local dev. Returns the URL + size. */
export async function uploadImageAction(form: FormData) {
  return run(async () => {
    await requireAdminAction();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Nessun file");
    return saveImage(await file.arrayBuffer());
  });
}

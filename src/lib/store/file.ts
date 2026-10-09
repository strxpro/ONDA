import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { seed } from "@/content/seed";
import type { SiteData } from "@/lib/types";
import { computeStats } from "./stats";
import { PK, type AdminUser, type AuditEntry, type Backend, type Key, type PageView, type PendingAction, type Row, type TableName } from "./types";

/**
 * Local development backend: everything lives in .data/onda.json.
 * Used automatically when Supabase env vars are missing. Never use it in production.
 */
type Db = {
  tables: Record<TableName, Row[]>;
  audit: AuditEntry[];
  pageViews: PageView[];
  pending: PendingAction[];
  admins: AdminUser[];
  seq: number;
};

const FILE = path.join(process.cwd(), ".data", "onda.json");
const g = globalThis as unknown as { __ondaDb?: Db };

function fresh(): Db {
  return {
    tables: {
      site_settings: [{ id: 1, ...seed.settings }],
      flavors: seed.flavors,
      price_items: seed.prices,
      opening_hours: seed.hours,
      special_days: seed.specialDays,
      announcements: seed.announcements,
      sections: seed.sections,
      gallery: seed.gallery,
      reviews: seed.reviews,
      comments: [],
      reservations: [],
    },
    audit: [],
    pageViews: [],
    pending: [],
    admins: [{ id: randomUUID(), email: process.env.ADMIN_EMAIL ?? null, telegram_user_id: process.env.ADMIN_TELEGRAM_ID ? Number(process.env.ADMIN_TELEGRAM_ID) : null, display_name: "Mauro", role: "owner" }],
    seq: 1,
  };
}

function db(): Db {
  if (g.__ondaDb) return g.__ondaDb;
  if (existsSync(FILE)) {
    const loaded = JSON.parse(readFileSync(FILE, "utf8")) as Db;
    // new tables added after the file was created
    for (const [k, v] of Object.entries(fresh().tables)) loaded.tables[k as TableName] ??= v;
    // texts added to the seed later appear automatically (the owner's edits always win)
    const st = loaded.tables.site_settings[0] as Row;
    st.texts = { ...seed.settings.texts, ...((st.texts as object) ?? {}) };
    g.__ondaDb = loaded;
  } else g.__ondaDb = fresh();
  return g.__ondaDb;
}

function save() {
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(db(), null, 1));
}

const clone = <T>(v: T): T => structuredClone(v);
const sameKey = (table: TableName, row: Row, key: Key) => String(row[PK[table]]) === String(key);
const bySort = (a: Row, b: Row) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);

export const fileBackend: Backend = {
  kind: "file",

  async readAll(): Promise<SiteData> {
    const t = db().tables;
    const today = new Date().toISOString().slice(0, 10);
    const { id: _id, ...settings } = t.site_settings[0] as Row;
    return clone({
      settings: settings as SiteData["settings"],
      flavors: (t.flavors.filter((f) => !f.deleted_at).sort(bySort) as SiteData["flavors"]),
      prices: t.price_items.slice().sort(bySort) as SiteData["prices"],
      hours: t.opening_hours.slice().sort((a, b) => Number(a.weekday) - Number(b.weekday)) as SiteData["hours"],
      specialDays: t.special_days.filter((d) => String(d.date) >= today).sort((a, b) => String(a.date).localeCompare(String(b.date))) as SiteData["specialDays"],
      announcements: t.announcements.filter((a) => a.is_active) as SiteData["announcements"],
      sections: t.sections.slice().sort(bySort) as SiteData["sections"],
      gallery: t.gallery.slice().sort(bySort) as SiteData["gallery"],
      reviews: t.reviews.slice().sort(bySort) as SiteData["reviews"],
      comments: t.comments
        .filter((c) => c.status === "approved")
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 40) as SiteData["comments"],
    });
  },

  async list(table) {
    return clone(db().tables[table]);
  },
  async get(table, key) {
    const r = db().tables[table].find((row) => sameKey(table, row, key));
    return r ? clone(r) : null;
  },
  async put(table, row) {
    const rows = db().tables[table];
    const key = row[PK[table]] as Key;
    const i = rows.findIndex((r) => sameKey(table, r, key));
    if (i >= 0) rows[i] = clone(row);
    else rows.push(clone(row));
    save();
    return clone(row);
  },
  async remove(table, key) {
    const d = db();
    d.tables[table] = d.tables[table].filter((r) => !sameKey(table, r, key));
    save();
  },

  async addAudit(e) {
    const d = db();
    const entry: AuditEntry = { ...e, undo_of: e.undo_of ?? null, id: d.seq++, created_at: new Date().toISOString(), undone_at: null };
    d.audit.unshift(entry);
    d.audit = d.audit.slice(0, 2000);
    save();
    return clone(entry);
  },
  async listAudit(limit) {
    return clone(db().audit.slice(0, limit));
  },
  async auditGroup(id) {
    const all = db().audit;
    const e = all.find((a) => a.id === id);
    if (!e) return [];
    return clone(e.batch_id ? all.filter((a) => a.batch_id === e.batch_id) : [e]);
  },
  async markUndone(ids) {
    const now = new Date().toISOString();
    db().audit.forEach((a) => ids.includes(a.id) && (a.undone_at = now));
    save();
  },

  async addPageView(v) {
    const d = db();
    d.pageViews.push({ ...v, created_at: new Date().toISOString() });
    if (d.pageViews.length > 50_000) d.pageViews = d.pageViews.slice(-50_000);
    save();
  },
  async stats(from, to) {
    return computeStats(db().pageViews.filter((v) => v.created_at! >= from.toISOString() && v.created_at! < to.toISOString()));
  },

  async createPending(p) {
    const row: PendingAction = { ...p, id: randomUUID(), status: "pending", created_at: new Date().toISOString() };
    db().pending.unshift(row);
    db().pending = db().pending.slice(0, 200);
    save();
    return clone(row);
  },
  async getPending(id) {
    const p = db().pending.find((x) => x.id === id);
    return p ? clone(p) : null;
  },
  async setPendingStatus(id, status) {
    const p = db().pending.find((x) => x.id === id);
    if (p) p.status = status;
    save();
  },
  async setPendingArgs(id, args) {
    const p = db().pending.find((x) => x.id === id);
    if (p) p.args = args;
    save();
  },
  async latestPending(telegramUserId, tool) {
    const p = db().pending.find((x) => x.telegram_user_id === telegramUserId && x.tool === tool && x.status === "pending" && Date.parse(x.expires_at) > Date.now());
    return p ? clone(p) : null;
  },

  async adminByEmail(email) {
    return db().admins.find((a) => a.email?.toLowerCase() === email.toLowerCase()) ?? null;
  },
  async adminByTelegram(id) {
    // Local dev: if no Telegram ID is configured, nobody is allowed (same as production).
    return db().admins.find((a) => a.telegram_user_id === id) ?? null;
  },
};

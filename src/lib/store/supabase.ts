import "server-only";

import { getServiceSupabase } from "@/lib/supabase/server";
import { DEFAULT_MOTION, type SiteData } from "@/lib/types";
import { PK, type AdminUser, type AuditEntry, type Backend, type PendingAction, type Row, type Stats } from "./types";

const db = () => getServiceSupabase();

/** Unwrap a Supabase response; lists come back as [] instead of null. */
function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return (res.data ?? (null as T)) as T;
}

/** Postgres numeric comes back as a string. */
const num = (v: unknown) => (v == null ? null : Number(v));
const strip = ({ created_at: _c, updated_at: _u, ...r }: Row) => r;

export const supabaseBackend: Backend = {
  kind: "supabase",

  async readAll(): Promise<SiteData> {
    const today = new Date().toISOString().slice(0, 10);
    const [settings, flavors, prices, hours, specialDays, announcements, sections, gallery, reviews, comments] = await Promise.all([
      db().from("site_settings").select("*").eq("id", 1).single(),
      db().from("flavors").select("*").is("deleted_at", null).order("sort_order"),
      db().from("price_items").select("*").order("sort_order"),
      db().from("opening_hours").select("*").order("weekday"),
      db().from("special_days").select("*").gte("date", today).order("date"),
      db().from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      db().from("sections").select("*").order("sort_order"),
      db().from("gallery").select("*").order("sort_order"),
      db().from("reviews").select("*").order("sort_order"),
      db().from("comments").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(40),
    ]);
    const s = must(settings) as Row;
    const { id: _id, ...rest } = strip(s);
    return {
      settings: {
        ...(rest as SiteData["settings"]),
        rating_google: num(s.rating_google),
        rating_tripadvisor: num(s.rating_tripadvisor),
        motion: { ...DEFAULT_MOTION, ...((s.motion as object) ?? {}) },
      },
      flavors: (must(flavors) ?? []).map(strip) as SiteData["flavors"],
      prices: (must(prices) ?? []).map((p: Row) => ({ ...strip(p), price_eur: Number(p.price_eur) })) as SiteData["prices"],
      hours: (must(hours) ?? []).map(strip) as SiteData["hours"],
      specialDays: (must(specialDays) ?? []).map(strip) as SiteData["specialDays"],
      announcements: (must(announcements) ?? []).map(strip) as SiteData["announcements"],
      sections: (must(sections) ?? []).map(strip) as SiteData["sections"],
      gallery: (must(gallery) ?? []).map(strip) as SiteData["gallery"],
      reviews: (must(reviews) ?? []).map((r: Row) => ({ ...strip(r), rating: Number(r.rating) })) as SiteData["reviews"],
      comments: (must(comments) ?? []).map(({ updated_at: _u, ...r }: Row) => r) as SiteData["comments"],
    };
  },

  async list(table) {
    return (must(await db().from(table).select("*")) ?? []) as Row[];
  },
  async get(table, key) {
    return must(await db().from(table).select("*").eq(PK[table], key).maybeSingle()) as Row | null;
  },
  async put(table, row) {
    return must(await db().from(table).upsert(strip(row), { onConflict: PK[table] }).select().single()) as Row;
  },
  async remove(table, key) {
    must(await db().from(table).delete().eq(PK[table], key));
  },

  async addAudit(e) {
    return must(await db().from("audit_log").insert(e).select().single()) as AuditEntry;
  },
  async listAudit(limit) {
    return must(await db().from("audit_log").select("*").order("id", { ascending: false }).limit(limit)) as AuditEntry[];
  },
  async auditGroup(id) {
    const e = must(await db().from("audit_log").select("*").eq("id", id).maybeSingle()) as AuditEntry | null;
    if (!e) return [];
    if (!e.batch_id) return [e];
    return must(await db().from("audit_log").select("*").eq("batch_id", e.batch_id).order("id", { ascending: false })) as AuditEntry[];
  },
  async markUndone(ids) {
    must(await db().from("audit_log").update({ undone_at: new Date().toISOString() }).in("id", ids));
  },

  async addPageView(v) {
    must(await db().from("page_views").insert(v));
  },
  async stats(from, to) {
    return must(await db().rpc("get_stats", { p_from: from.toISOString(), p_to: to.toISOString() })) as Stats;
  },

  async createPending(p) {
    return must(await db().from("bot_pending_actions").insert(p).select().single()) as PendingAction;
  },
  async getPending(id) {
    return must(await db().from("bot_pending_actions").select("*").eq("id", id).maybeSingle()) as PendingAction | null;
  },
  async setPendingStatus(id, status) {
    must(await db().from("bot_pending_actions").update({ status }).eq("id", id));
  },
  async setPendingArgs(id, args) {
    must(await db().from("bot_pending_actions").update({ args }).eq("id", id));
  },
  async latestPending(telegramUserId, tool) {
    const rows = must(
      await db().from("bot_pending_actions").select("*").eq("telegram_user_id", telegramUserId).eq("tool", tool).eq("status", "pending").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1),
    ) as PendingAction[];
    return rows[0] ?? null;
  },

  async adminByEmail(email) {
    return must(await db().from("admin_users").select("*").ilike("email", email).maybeSingle()) as AdminUser | null;
  },
  async adminByTelegram(id) {
    return must(await db().from("admin_users").select("*").eq("telegram_user_id", id).maybeSingle()) as AdminUser | null;
  },
};

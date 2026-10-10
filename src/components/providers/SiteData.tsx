"use client";

import { MotionConfig } from "motion/react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { hasSupabase } from "@/lib/env";
import { DEFAULT_MOTION, type Locale, type MotionSettings, type SiteData } from "@/lib/shared";
import { setOwnIngredientPhotos } from "@/lib/ingredients";

type Ctx = { data: SiteData; locale: Locale; motion: MotionSettings };
const SiteCtx = createContext<Ctx | null>(null);

export function useSite() {
  const c = useContext(SiteCtx);
  if (!c) throw new Error("useSite outside SiteDataProvider");
  return c;
}
export const useMotionSettings = () => useSite().motion;

type Row = Record<string, unknown>;
const sortBy = (k: string) => (a: Row, b: Row) => Number(a[k] ?? 0) - Number(b[k] ?? 0);

/** Merge one changed row into the page data. `row = null` means deleted. */
function applyChange(d: SiteData, table: string, key: string, row: Row | null): SiteData {
  const upsert = <T extends Row>(list: T[], pk: string, keep: (r: Row) => boolean, sort?: (a: Row, b: Row) => number) => {
    const rest = list.filter((r) => String(r[pk]) !== key);
    const next = row && keep(row) ? [...rest, row as T] : rest;
    return sort ? next.sort(sort) : next;
  };
  const num = (r: Row | null, k: string) => (r && r[k] != null ? { ...r, [k]: Number(r[k]) } : r);
  switch (table) {
    case "site_settings": {
      if (!row) return d;
      const { id: _id, created_at: _c, updated_at: _u, ...s } = row;
      return { ...d, settings: { ...(s as SiteData["settings"]), motion: { ...DEFAULT_MOTION, ...((s.motion as object) ?? {}) } } };
    }
    case "flavors":
      return { ...d, flavors: upsert(d.flavors, "id", (r) => !r.deleted_at, sortBy("sort_order")) };
    case "price_items":
      row = num(row, "price_eur");
      return { ...d, prices: upsert(d.prices, "id", () => true, sortBy("sort_order")) };
    case "opening_hours":
      row = row && { ...row, weekday: Number(row.weekday) };
      return { ...d, hours: upsert(d.hours, "weekday", () => true, sortBy("weekday")) };
    case "special_days":
      return { ...d, specialDays: upsert(d.specialDays, "date", () => true) };
    case "announcements":
      return { ...d, announcements: upsert(d.announcements, "id", (r) => Boolean(r.is_active)) };
    case "sections":
      return { ...d, sections: upsert(d.sections, "key", () => true, sortBy("sort_order")) };
    case "gallery":
      return { ...d, gallery: upsert(d.gallery, "id", () => true, sortBy("sort_order")) };
    case "reviews":
      row = num(row, "rating");
      return { ...d, reviews: upsert(d.reviews, "id", () => true, sortBy("sort_order")) };
    case "comments":
      return { ...d, comments: upsert(d.comments, "id", (r) => r.status === "approved").sort((a, b) => b.created_at.localeCompare(a.created_at)) };
  }
  return d;
}

const PK: Record<string, string> = { site_settings: "id", opening_hours: "weekday", special_days: "date", sections: "key" };
const TABLES = ["site_settings", "flavors", "price_items", "opening_hours", "special_days", "announcements", "sections", "gallery", "reviews", "comments"];

/** Page data + live updates: Supabase Realtime in production, server-sent events in local dev. */
export function SiteDataProvider({ initial, locale, children }: { initial: SiteData; locale: Locale; children: ReactNode }) {
  const [data, setData] = useState(initial);

  useEffect(() => setData(initial), [initial]);

  // language switched: the texts are already in the new language — let them re-form out of the blur
  useEffect(() => {
    const html = document.documentElement;
    if (!html.dataset.langswap) return;
    const id = window.setTimeout(() => delete html.dataset.langswap, 60);
    return () => window.clearTimeout(id);
  }, [locale]);

  useEffect(() => {
    const onChange = (table: string, key: string, row: Row | null) => setData((d) => applyChange(d, table, key, row));

    if (hasSupabase) {
      // loaded on demand so the Supabase client isn't part of the first paint
      let cleanup = () => {};
      let cancelled = false;
      import("@/lib/supabase/browser").then(({ getBrowserSupabase }) => {
        if (cancelled) return;
        const sb = getBrowserSupabase()!;
        const channel = sb.channel("onda-live");
        for (const table of TABLES) {
          channel.on("postgres_changes", { event: "*", schema: "public", table }, (p) => {
            const row = (p.eventType === "DELETE" ? null : p.new) as Row | null;
            const ref = (p.eventType === "DELETE" ? p.old : p.new) as Row;
            onChange(table, String(ref[PK[table] ?? "id"]), row);
          });
        }
        channel.subscribe();
        cleanup = () => void sb.removeChannel(channel);
      });
      return () => {
        cancelled = true;
        cleanup();
      };
    }

    const es = new EventSource("/api/live");
    es.onmessage = (m) => {
      const e = JSON.parse(m.data) as { table: string; key: string; row: Row | null };
      onChange(e.table, e.key, e.row);
    };
    return () => es.close();
  }, []);

  // the owner's own ingredient photos (sent from Telegram) win over the stock ones
  useMemo(() => setOwnIngredientPhotos(data.settings.texts as Record<string, { it?: string }>), [data.settings.texts]);
  const value = useMemo(() => ({ data, locale, motion: { ...DEFAULT_MOTION, ...data.settings.motion } }), [data, locale]);
  return (
    <SiteCtx.Provider value={value}>
      {/* honour the OS "reduce motion" setting, and the owner's "intensity 0" */}
      <MotionConfig reducedMotion={value.motion.intensity === 0 ? "always" : "user"}>{children}</MotionConfig>
    </SiteCtx.Provider>
  );
}


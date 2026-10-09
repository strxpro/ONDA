import "server-only";

import { unstable_cache } from "next/cache";
import { hasSupabase } from "@/lib/env";
import { store } from "@/lib/store";
import { DEFAULT_MOTION, type SiteData } from "@/lib/types";

/** Cache tag invalidated (revalidateTag) after every content mutation. */
export const SITE_TAG = "site-data";

const cachedSiteData = unstable_cache(() => store().readAll(), ["site-data"], {
  tags: [SITE_TAG],
  revalidate: 3600, // safety net; mutations revalidate the tag immediately
});

/** All public content (Supabase, or the local file store in development). */
export async function getSiteData(): Promise<SiteData & { source: "supabase" | "file" }> {
  const data = hasSupabase ? await cachedSiteData() : await store().readAll();
  return { ...data, settings: { ...data.settings, motion: { ...DEFAULT_MOTION, ...data.settings.motion } }, source: hasSupabase ? "supabase" : "file" };
}

/** Public env (safe in the browser). */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

/** True when Supabase is configured; otherwise the site runs on src/content/seed.ts. */
export const hasSupabase = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

/** Server-only secrets. Throws with a clear message when one is missing. */
export function serverEnv(name: "SUPABASE_SERVICE_ROLE_KEY" | "TELEGRAM_BOT_TOKEN" | "TELEGRAM_WEBHOOK_SECRET" | "ANTHROPIC_API_KEY" | "OPENAI_API_KEY" | "ANALYTICS_SALT"): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name} (see README → Environment)`);
  return value;
}

/** Public origin of the site (for canonical URLs, sitemap, OG images, webhook). */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

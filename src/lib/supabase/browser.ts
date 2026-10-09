"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabase, publicEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Singleton browser client (anon key, RLS applies). Null when Supabase isn't configured. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  client ??= createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return client;
}

import "server-only";

import { hasSupabase } from "@/lib/env";
import { fileBackend } from "./file";
import { supabaseBackend } from "./supabase";
import type { Backend } from "./types";

let warned = false;

/** Supabase when configured; otherwise the local JSON file (.data/onda.json — development only). */
export function store(): Backend {
  if (hasSupabase) return supabaseBackend;
  if (process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn("[onda] Supabase is not configured: using the local file store. Do not deploy like this.");
  }
  return fileBackend;
}

export * from "./types";

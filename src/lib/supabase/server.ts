import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv, serverEnv } from "@/lib/env";

/** Cookie-bound client for the signed-in admin (RLS applies). Use in Server Components / Route Handlers. */
export async function getSessionSupabase(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there; middleware refreshes them.
        }
      },
    },
  });
}

/** Anonymous, cookie-less client for public reads inside cached functions. */
export function getPublicSupabase(): SupabaseClient {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

let service: SupabaseClient | null = null;

/** Service-role client: bypasses RLS. Only for server routes that validate input and write audit_log. */
export function getServiceSupabase(): SupabaseClient {
  service ??= createClient(publicEnv.supabaseUrl, serverEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  return service;
}

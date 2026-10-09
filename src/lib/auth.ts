import "server-only";

import { redirect } from "next/navigation";
import { hasSupabase } from "./env";
import { store, type Actor } from "./store";
import { getSessionSupabase } from "./supabase/server";

/** The signed-in admin, or null. Local dev without Supabase: everyone on localhost is "local-dev". */
export async function currentAdmin(): Promise<Actor | null> {
  if (!hasSupabase) return process.env.NODE_ENV !== "production" ? { actor: "local-dev", source: "admin" } : null;
  const sb = await getSessionSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return null;
  const admin = await store().adminByEmail(user.email);
  return admin ? { actor: user.email, source: "admin" } : null;
}

/** For pages: redirect to the login screen when not an admin. */
export async function requireAdmin(): Promise<Actor> {
  const a = await currentAdmin();
  if (!a) redirect("/admin/login");
  return a;
}

/** For server actions: throw instead of redirecting. */
export async function requireAdminAction(): Promise<Actor> {
  const a = await currentAdmin();
  if (!a) throw new Error("Non autorizzato");
  return a;
}

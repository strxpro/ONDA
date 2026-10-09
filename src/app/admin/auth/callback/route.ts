import { NextResponse } from "next/server";
import { getSessionSupabase } from "@/lib/supabase/server";

/** Magic-link landing: exchange the code for a session cookie, then go to the panel. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const sb = await getSessionSupabase();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/admin/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL("/admin", url.origin));
}

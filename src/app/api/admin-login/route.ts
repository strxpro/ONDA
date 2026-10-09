import { z } from "zod";
import { hasSupabase } from "@/lib/env";
import { store } from "@/lib/store";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

const recent = new Map<string, number[]>();

/**
 * Before the magic link is sent: if the e-mail belongs to an admin (admin_users), make sure the login account exists
 * (Supabase only sends links to existing users — public sign-ups stay closed). Always answers ok: nothing is revealed.
 */
export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !hasSupabase) return Response.json({ ok: true });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 600_000);
  if (hits.length >= 5) return Response.json({ ok: true });
  recent.set(ip, [...hits, now]);

  const admin = await store().adminByEmail(parsed.data.email);
  if (admin) {
    const { error } = await getServiceSupabase().auth.admin.createUser({ email: parsed.data.email, email_confirm: true });
    if (error && !/already|registered|exists/i.test(error.message)) console.error("[admin-login]", error.message);
  }
  return Response.json({ ok: true });
}

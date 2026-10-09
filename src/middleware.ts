import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/** Keeps the Supabase auth cookie fresh for the admin panel. */
async function refreshAdminSession(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  if (!url || !key) return res;
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return res;
}

export default function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) return refreshAdminSession(req);
  if (req.nextUrl.pathname.startsWith("/promo")) return NextResponse.next(); // the presentation film (dev only)
  return intl(req);
}

export const config = {
  // Locale routing for the public site + session refresh for /admin. Skip /api, Next internals and files.
  matcher: ["/((?!api|_next|_vercel|uploads|.*\\..*).*)"],
};

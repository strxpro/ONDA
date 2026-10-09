"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Sends one cookieless page view per route (see /api/track). */
export function Tracker() {
  const path = usePathname();
  const locale = useLocale();
  useEffect(() => {
    const body = JSON.stringify({ path, referrer: document.referrer || null, locale });
    if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
      fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  }, [path, locale]);
  return null;
}

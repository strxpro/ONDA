"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { hhmm, isOpenNow, todayHours } from "@/lib/hours";
import type { OpeningHours, SpecialDay } from "@/lib/shared";

type State = { open: boolean; detail: string } | null;

/**
 * A little neon sign: lit "Aperto" with the closing time, or a switched-off tube with the reopening time.
 * Computed on the client only (it depends on the visitor's clock), re-checked every minute.
 */
export function OpenBadge({ hours, specialDays, timeZone, className = "" }: { hours: OpeningHours[]; specialDays: SpecialDay[]; timeZone: string; className?: string }) {
  const t = useTranslations("ui");
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    const check = () => {
      const open = isOpenNow(hours, specialDays, timeZone);
      const { now, day } = todayHours(hours, specialDays, timeZone);
      const toMin = (x: string | null) => (x ? +x.slice(0, 2) * 60 + +x.slice(3, 5) : null);
      let detail = "";
      if (open && day?.close_time) detail = t("untilTime", { time: hhmm(day.close_time) });
      else if (day && !day.is_closed && day.open_time && now.minutes < (toMin(day.open_time) ?? 0)) detail = t("opensAt", { time: hhmm(day.open_time) });
      else detail = t("opensTomorrow");
      setState({ open, detail });
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [hours, specialDays, timeZone, t]);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-[#2a1712] py-1 pr-3.5 pl-3 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.08),0_6px_16px_-6px_rgba(42,23,18,0.6)] transition-opacity duration-500 ${state ? "opacity-100" : "opacity-0"} ${className}`}
      style={{ ["--neon" as string]: state?.open ? "#ff4fa0" : "#555" }}
      aria-live="polite"
    >
      <span className={`text-xl leading-none ${state?.open ? "neon-text" : "neon-off"}`}>{state?.open ? t("openNow") : t("closed")}</span>
      <span className="hidden text-[11px] font-bold tracking-wide text-white/60 uppercase sm:inline">{state?.detail}</span>
    </span>
  );
}

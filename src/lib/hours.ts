import type { OpeningHours, SpecialDay } from "./shared";

/** Current date/time parts in the shop's timezone. */
export function nowIn(timeZone: string, at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: +parts.hour * 60 + +parts.minute, weekday };
}

const toMin = (t: string | null) => (t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null);
export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

/** Today's effective hours (a special day overrides the weekly schedule). */
export function todayHours(hours: OpeningHours[], special: SpecialDay[], timeZone: string, at = new Date()) {
  const n = nowIn(timeZone, at);
  const sp = special.find((s) => s.date === n.date);
  const day = sp ?? hours.find((h) => h.weekday === n.weekday);
  return { now: n, day, special: sp };
}

export function isOpenNow(hours: OpeningHours[], special: SpecialDay[], timeZone: string, at = new Date()): boolean {
  const { now, day } = todayHours(hours, special, timeZone, at);
  if (!day || day.is_closed) return false;
  const open = toMin(day.open_time)!;
  let close = toMin(day.close_time)!;
  if (close <= open) close += 24 * 60; // closes after midnight
  return now.minutes >= open && now.minutes < close;
}

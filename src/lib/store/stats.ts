import type { PageView, Stats } from "./types";

const top = <K extends string>(rows: PageView[], key: (v: PageView) => string, name: K, limit = 10) =>
  Object.entries(
    rows.reduce<Record<string, number>>((acc, v) => {
      const k = key(v);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([k, views]) => ({ [name]: k, views }) as { [P in K]: string } & { views: number })
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

/** Same numbers as the SQL get_stats() function, for the local backend. */
export function computeStats(all: PageView[], timeZone = "Europe/Rome"): Stats {
  const rows = all.filter((v) => v.device !== "bot");
  const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));
  const days = new Map<string, { views: number; visitors: Set<string> }>();
  for (const v of rows) {
    const d = dayOf(v.created_at!);
    const e = days.get(d) ?? { views: 0, visitors: new Set() };
    e.views++;
    e.visitors.add(v.visitor_hash);
    days.set(d, e);
  }
  return {
    visits: rows.length,
    visitors: new Set(rows.map((v) => v.visitor_hash)).size,
    top_pages: top(rows, (v) => v.path, "path"),
    devices: top(rows, (v) => v.device || "unknown", "device"),
    countries: top(rows, (v) => v.country || "??", "country"),
    daily: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, e]) => ({ day, views: e.views, visitors: e.visitors.size })),
  };
}

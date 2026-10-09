"use client";

import { DesktopTower, DeviceMobile, DeviceTablet, Globe } from "@phosphor-icons/react";
import { useState } from "react";
import { saveRow } from "@/app/admin/actions";
import type { Stats } from "@/lib/store/types";
import type { Flavor } from "@/lib/shared";
import { ScoopImg, scoopPhoto } from "../../ice/PhotoStack";
import { Scoop } from "../../ice/Scoop";
import { Card, PageTitle, Toggle, useAction } from "../ui";

const BAR = "#E2557A"; // single series → one hue; text stays in ink colors

export function Dashboard({ stats, flavors }: { stats: { today: Stats; week: Stats; month: Stats }; flavors: Flavor[] }) {
  const { call } = useAction();
  const available = flavors.filter((f) => f.is_available_today).length;

  return (
    <>
      <PageTitle title="Oggi" subtitle="Visite al sito e gusti in vetrina" />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Oggi", s: stats.today },
          { label: "7 giorni", s: stats.week },
          { label: "30 giorni", s: stats.month },
        ].map(({ label, s }) => (
          <Card key={label} className="!p-4">
            <p className="text-xs font-bold tracking-wide text-chocolate/60 uppercase">{label}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums sm:text-4xl">{s.visitors}</p>
            <p className="text-xs font-semibold text-chocolate/60">
              persone · {s.visits} visite
            </p>
          </Card>
        ))}
      </div>

      <Card className="mt-3">
        <p className="font-display text-lg font-semibold">Visite al giorno (30 giorni)</p>
        <DailyChart daily={stats.month.daily} />
      </Card>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <RankCard title="Pagine" rows={stats.month.top_pages.map((p) => ({ label: p.path, value: p.views }))} />
        <RankCard
          title="Dispositivi"
          rows={stats.month.devices.map((d) => ({ label: d.device, value: d.views, icon: d.device === "mobile" ? DeviceMobile : d.device === "tablet" ? DeviceTablet : DesktopTower }))}
        />
        <RankCard title="Paesi" rows={stats.month.countries.map((c) => ({ label: c.country === "??" ? "Sconosciuto" : c.country, value: c.views, icon: Globe }))} />
      </div>

      <div className="mt-8 mb-3 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold">Gusti in vetrina</h2>
        <p className="text-sm font-bold text-chocolate/60">
          {available} / {flavors.length} disponibili
        </p>
      </div>
      <Card className="!p-2">
        <ul className="divide-y divide-chocolate/5">
          {flavors.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-2 py-2.5">
              {scoopPhoto(f) ? (
                <span className={`block h-9 w-10 shrink-0 ${f.is_available_today ? "" : "grayscale"}`}>
                  <ScoopImg src={scoopPhoto(f)!} />
                </span>
              ) : (
                <Scoop color={f.color_primary} color2={f.color_secondary} texture={f.scoop_texture} className={`w-10 shrink-0 transition ${f.is_available_today ? "" : "grayscale"}`} />
              )}
              <span className={`flex-1 font-display text-lg font-semibold ${f.is_available_today ? "" : "text-chocolate/40 line-through"}`}>{f.name.it}</span>
              <span className="text-xs font-bold text-chocolate/50">{f.is_available_today ? "C'è" : "Finito oggi"}</span>
              <Toggle
                checked={f.is_available_today}
                label={`${f.name.it} disponibile`}
                onChange={(v) => call(() => saveRow("flavors", f.id, { is_available_today: v }), v ? `${f.name.it}: di nuovo disponibile` : `${f.name.it}: finito!`)}
              />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function RankCard({ title, rows }: { title: string; rows: { label: string; value: number; icon?: React.ComponentType<{ className?: string; weight?: "duotone" }> }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <p className="mb-2 font-display text-lg font-semibold">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm font-semibold text-chocolate/50">Ancora nessun dato</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 6).map((r) => (
            <li key={r.label} className="text-sm font-bold">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  {r.icon && <r.icon weight="duotone" className="size-4 shrink-0" />}
                  <span className="truncate">{r.label}</span>
                </span>
                <span className="tabular-nums text-chocolate/70">{r.value}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-chocolate/5">
                <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: BAR }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** 30 thin bars, rounded tops, recessive axis, hover tooltip per bar. */
function DailyChart({ daily }: { daily: Stats["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  // fill missing days with zero so the time axis is honest
  const days: { day: string; views: number; visitors: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    days.push(daily.find((x) => String(x.day).slice(0, 10) === d) ?? { day: d, views: 0, visitors: 0 });
  }
  const max = Math.max(4, ...days.map((d) => d.visitors));
  const W = 600;
  const H = 160;
  const bw = W / days.length;
  const h = hover != null ? days[hover] : null;

  return (
    <div className="relative mt-3">
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Persone al giorno negli ultimi 30 giorni" onMouseLeave={() => setHover(null)}>
        {[0.5, 1].map((g) => (
          <line key={g} x1="0" x2={W} y1={H - g * H} y2={H - g * H} stroke="#4B2A20" strokeOpacity="0.08" />
        ))}
        <line x1="0" x2={W} y1={H} y2={H} stroke="#4B2A20" strokeOpacity="0.2" />
        {days.map((d, i) => {
          const bh = (d.visitors / max) * (H - 6);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={i * bw} y="0" width={bw} height={H} fill="transparent" />
              {bh > 0 && <rect x={i * bw + 2} y={H - bh} width={bw - 4} height={bh} rx="4" fill={BAR} opacity={hover == null || hover === i ? 1 : 0.45} />}
            </g>
          );
        })}
        <text x="0" y={H + 15} fontSize="11" fill="#4B2A20" opacity="0.6">
          {days[0].day.slice(5)}
        </text>
        <text x={W} y={H + 15} fontSize="11" fill="#4B2A20" opacity="0.6" textAnchor="end">
          oggi
        </text>
        <text x="2" y="12" fontSize="11" fill="#4B2A20" opacity="0.6">
          {max}
        </text>
      </svg>
      {h && (
        <div className="pointer-events-none absolute -top-2 rounded-xl bg-chocolate px-3 py-1.5 text-xs font-bold text-cream" style={{ left: `clamp(0px, calc(${((hover! + 0.5) / days.length) * 100}% - 60px), calc(100% - 130px))` }}>
          {new Date(h.day).toLocaleDateString("it", { day: "numeric", month: "short" })}: {h.visitors} persone · {h.views} visite
        </div>
      )}
      <table className="sr-only">
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.visitors}</td>
              <td>{d.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

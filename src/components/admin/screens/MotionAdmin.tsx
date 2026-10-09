"use client";

import { useState } from "react";
import { saveRow } from "@/app/admin/actions";
import type { MotionSettings } from "@/lib/shared";
import { Button, Card, PageTitle, Toggle, useAction } from "../ui";

function Slider({ label, hint, value, min, max, step, onChange, format }: { label: string; hint: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-bold">{label}</span>
        <span className="font-display text-lg font-semibold tabular-nums">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[#E2557A]" />
      <p className="text-xs font-semibold text-chocolate/50">{hint}</p>
    </div>
  );
}

export function MotionAdmin({ motion }: { motion: MotionSettings }) {
  const { call, pending } = useAction();
  const [m, setM] = useState(motion);
  const set = <K extends keyof MotionSettings>(k: K, v: MotionSettings[K]) => setM((x) => ({ ...x, [k]: v }));

  return (
    <>
      <PageTitle title="Animazioni" subtitle="Quanto si muove il sito" />
      <Card className="space-y-6">
        <Slider label="Intensità" hint="0 = sito fermo · 1 = normale · 1.5 = extra giocoso" value={m.intensity} min={0} max={1.5} step={0.1} onChange={(v) => set("intensity", v)} format={(v) => v.toFixed(1)} />
        <Slider label="Cambio foto in galleria" hint="Ogni quanti secondi una foto va sul cono" value={m.galleryInterval} min={2} max={20} step={0.5} onChange={(v) => set("galleryInterval", v)} format={(v) => `${v}s`} />
        <Slider label="Velocità dello scioglimento" hint="Più alto = il gelato cola più in fretta" value={m.meltSpeed} min={0.3} max={3} step={0.1} onChange={(v) => set("meltSpeed", v)} format={(v) => `${v.toFixed(1)}×`} />
        <div>
          <p className="mb-2 font-bold">Animazione d&apos;apertura (cono con le palline)</p>
          <div className="grid grid-cols-3 gap-2">
            {(["full", "short", "off"] as const).map((p) => (
              <button key={p} type="button" onClick={() => set("preloader", p)} className={`min-h-12 rounded-2xl font-bold ${m.preloader === p ? "bg-chocolate text-cream" : "bg-cream"}`}>
                {{ full: "Completa", short: "Breve", off: "Spenta" }[p]}
              </button>
            ))}
          </div>
        </div>
        {(
          [
            ["smoothScroll", "Scorrimento morbido"],
            ["cursor", "Cursore colorato (computer)"],
            ["sprinkles", "Codette colorate"],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="font-bold">{label}</span>
            <Toggle checked={m[k]} onChange={(v) => set(k, v)} />
          </div>
        ))}
      </Card>
      <Button className="mt-4 w-full" disabled={pending} onClick={() => call(() => saveRow("site_settings", 1, { motion: m }))}>
        Salva
      </Button>
    </>
  );
}

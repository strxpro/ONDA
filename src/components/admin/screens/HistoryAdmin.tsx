"use client";

import { ArrowCounterClockwise, ArrowsCounterClockwise, CheckSquare, Desktop, Square, TelegramLogo, Warning } from "@phosphor-icons/react";
import { useState } from "react";
import { restoreDefaultsAction, undoAction } from "@/app/admin/actions";
import type { AuditEntry } from "@/lib/store/types";
import { Button, Card, PageTitle, useAction } from "../ui";

const ACTION: Record<string, string> = {
  set_flavor_availability: "Disponibilità gusto",
  add_flavor: "Nuovo gusto",
  update_flavor: "Gusto modificato",
  remove_flavor: "Gusto tolto",
  replace_today_flavors: "Gusti di oggi",
  update_price: "Prezzo",
  set_hours: "Orari",
  set_banner: "Banner",
  clear_banner: "Banner tolto",
  toggle_section: "Sezione",
  set_motion: "Animazioni",
  set_text: "Testo",
  sync_google_reviews: "Recensioni Google",
  undo: "Annullato",
  restore_defaults: "Ripristino originale",
  set_signature_flavor: "Gusto firma",
};
const TABLE: Record<string, string> = {
  flavors: "Gusti",
  price_items: "Prezzi",
  opening_hours: "Orari",
  special_days: "Giorni speciali",
  announcements: "Banner",
  sections: "Sezioni",
  gallery: "Galleria",
  reviews: "Recensioni",
  site_settings: "Impostazioni",
};

type Row = Record<string, unknown> | null;
const name = (r: Row) => {
  const v = (r?.name ?? r?.label ?? r?.text ?? r?.alt) as { it?: string } | undefined;
  return v?.it ?? (r?.key as string) ?? (r?.date as string) ?? "";
};

/** Human summary of what changed between before/after. */
function describe(e: AuditEntry) {
  if (!e.before) return `creato ${name(e.after)}`;
  if (!e.after) return `eliminato ${name(e.before)}`;
  const changed = Object.keys(e.after).filter((k) => JSON.stringify(e.after![k]) !== JSON.stringify(e.before![k]) && !["updated_at", "created_at"].includes(k));
  const parts = changed.slice(0, 3).map((k) => {
    const b = e.before![k];
    const a = e.after![k];
    if (k === "is_available_today") return a ? "disponibile" : "finito";
    if (k === "is_visible" || k === "is_active") return a ? "visibile" : "nascosto";
    if (k === "price_eur") return `€ ${Number(b).toFixed(2)} → € ${Number(a).toFixed(2)}`;
    if (typeof a === "string" || typeof a === "number") return `${k}: ${b ?? "—"} → ${a}`;
    return k;
  });
  return `${name(e.after)} · ${parts.join(", ")}${changed.length > 3 ? "…" : ""}`;
}

export function HistoryAdmin({ entries }: { entries: AuditEntry[] }) {
  const { call, pending } = useAction();
  // one row per batch (multi-row changes undo together)
  const seen = new Set<string>();
  const rows = entries.filter((e) => {
    if (!e.batch_id) return true;
    if (seen.has(e.batch_id)) return false;
    seen.add(e.batch_id);
    return true;
  });
  const batchSize = (e: AuditEntry) => (e.batch_id ? entries.filter((x) => x.batch_id === e.batch_id).length : 1);

  return (
    <>
      <PageTitle title="Cronologia" subtitle="Ogni modifica, dal pannello o da Telegram. Un tocco per annullare." />
      <RestoreCard />
      {rows.length === 0 ? (
        <Card>
          <p className="font-semibold text-chocolate/60">Ancora nessuna modifica.</p>
        </Card>
      ) : (
        <Card className="!p-2">
          <ul className="divide-y divide-chocolate/5">
            {rows.map((e) => (
              <li key={e.id} className={`flex items-center gap-3 px-2 py-3 ${e.undone_at ? "opacity-40" : ""}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream">
                  {e.source === "telegram" ? <TelegramLogo weight="duotone" className="size-5 text-[#229ED9]" /> : <Desktop weight="duotone" className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {ACTION[e.action] ?? TABLE[e.table_name] ?? e.action}
                    {batchSize(e) > 1 && <span className="text-chocolate/50"> · {batchSize(e)} modifiche</span>}
                  </p>
                  <p className="truncate text-sm text-chocolate/60">{describe(e)}</p>
                  <p className="text-xs font-semibold text-chocolate/40">
                    {new Date(e.created_at).toLocaleString("it", { dateStyle: "short", timeStyle: "short" })} · {e.actor}
                  </p>
                </div>
                {!e.undone_at && e.action !== "undo" && (
                  <Button variant="soft" label="Annulla" disabled={pending} onClick={() => call(() => undoAction(e.id), "Annullato! Il sito è tornato com'era.")}>
                    <ArrowCounterClockwise weight="bold" className="size-5" /> <span className="hidden sm:inline">Annulla</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

const PARTS = { flavors: "Gusti", prices: "Prezzi", hours: "Orari e giorni speciali", texts: "Testi e banner", sections: "Sezioni del sito", motion: "Animazioni" } as const;
type Part = keyof typeof PARTS;

/**
 * "Ripristina originale": put the chosen parts back as they were delivered. One batch: it appears in the list below
 * and a single "Annulla" brings everything back. Comments, reviews, reservations and uploaded photos are never touched.
 */
function RestoreCard() {
  const { call, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<Set<Part>>(new Set(Object.keys(PARTS) as Part[]));
  const toggle = (k: Part) => setParts((p) => (p.has(k) ? new Set([...p].filter((x) => x !== k)) : new Set([...p, k])));
  return (
    <Card className="mb-4">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 text-left">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lemon-soft">
            <ArrowsCounterClockwise weight="bold" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold">Ripristina originale</span>
            <span className="block text-sm text-chocolate/60">Rimetti gusti, prezzi, orari o testi come all&apos;inizio. Si può annullare.</span>
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            <Warning weight="duotone" className="size-6 text-mango" /> Cosa vuoi rimettere come all&apos;inizio?
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {(Object.keys(PARTS) as Part[]).map((k) => (
              <button key={k} type="button" onClick={() => toggle(k)} className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2.5 text-left font-semibold">
                {parts.has(k) ? <CheckSquare weight="fill" className="size-5" /> : <Square weight="bold" className="size-5 text-chocolate/40" />}
                {PARTS[k]}
              </button>
            ))}
          </div>
          <p className="text-sm text-chocolate/60">Commenti, recensioni, prenotazioni e foto caricate restano. Dopo, un tocco su «Annulla» qui sotto riporta tutto com&apos;era.</p>
          <div className="flex gap-2">
            <Button
              disabled={pending || !parts.size}
              onClick={() => confirm(`Ripristinare all'originale: ${[...parts].map((k) => PARTS[k]).join(", ")}?`) && call(() => restoreDefaultsAction([...parts]), "Ripristinato all'originale").then(() => setOpen(false))}
            >
              <ArrowsCounterClockwise weight="bold" className="size-5" /> Ripristina
            </Button>
            <Button variant="soft" onClick={() => setOpen(false)} label="Chiudi">
              Chiudi
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

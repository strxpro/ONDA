"use client";

import { ArrowCounterClockwise, Desktop, TelegramLogo } from "@phosphor-icons/react";
import { undoAction } from "@/app/admin/actions";
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

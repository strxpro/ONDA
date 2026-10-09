"use client";

import { Check, Phone, Trash, X } from "@phosphor-icons/react";
import { deleteRowAction, saveRow } from "@/app/admin/actions";
import type { Reservation } from "@/lib/types";
import { Button, Card, PageTitle, useAction } from "../ui";

const LABEL = { new: "Nuove", confirmed: "Confermate", done: "Ritirate", declined: "Rifiutate" } as const;
const when = (iso: string) => new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Pre-orders from the site (also sent to Telegram with ✅ / ❌): confirm, mark as picked up, or decline. */
export function ReservationsAdmin({ rows }: { rows: Reservation[] }) {
  const { call } = useAction();
  const set = (r: Reservation, status: Reservation["status"]) => call(() => saveRow("reservations", r.id, { status }), LABEL[status]);
  return (
    <>
      <PageTitle title="Prenotazioni" subtitle="Gelato al chilo e dolci prenotati dal sito. Arrivano anche su Telegram" />
      <div className="space-y-6">
        {(["new", "confirmed", "done", "declined"] as const).map((st) => {
          const list = rows.filter((r) => r.status === st);
          if (!list.length && st !== "new") return null;
          return (
            <section key={st}>
              <h2 className="mb-2 font-display text-xl font-bold">
                {LABEL[st]} <span className="text-chocolate/40">{list.length}</span>
              </h2>
              {!list.length ? (
                <Card>
                  <p className="text-chocolate/60">Nessuna prenotazione nuova.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {list.map((r) => (
                    <Card key={r.id} className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-bold">{when(r.pickup_at)}</p>
                        <p className="font-semibold">{r.items}</p>
                        <p className="text-sm text-chocolate/60">
                          {r.name} ·{" "}
                          <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 underline">
                            <Phone className="size-3.5" /> {r.phone}
                          </a>
                          {r.notes ? ` · ${r.notes}` : ""}
                        </p>
                      </div>
                      {st === "new" && (
                        <Button onClick={() => set(r, "confirmed")} label="Conferma">
                          <Check weight="bold" className="size-5" /> Conferma
                        </Button>
                      )}
                      {st === "confirmed" && (
                        <Button onClick={() => set(r, "done")} label="Ritirata">
                          <Check weight="bold" className="size-5" /> Ritirata
                        </Button>
                      )}
                      {(st === "new" || st === "confirmed") && (
                        <Button variant="soft" onClick={() => set(r, "declined")} label="Rifiuta">
                          <X weight="bold" className="size-5" />
                        </Button>
                      )}
                      <Button variant="danger" label="Elimina" onClick={() => confirm("Eliminare la prenotazione?") && call(() => deleteRowAction("reservations", r.id), "Eliminata")}>
                        <Trash weight="bold" className="size-5" />
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

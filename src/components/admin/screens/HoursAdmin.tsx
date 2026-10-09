"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { createRowAction, deleteRowAction, saveRow } from "@/app/admin/actions";
import { hhmm } from "@/lib/hours";
import type { OpeningHours, SpecialDay } from "@/lib/shared";
import { Button, Card, Field, inputCls, PageTitle, Toggle, useAction } from "../ui";

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export function HoursAdmin({ hours, special }: { hours: OpeningHours[]; special: SpecialDay[] }) {
  const { call } = useAction();
  const [newDay, setNewDay] = useState({ date: "", open_time: "10:30", close_time: "22:30", is_closed: false, note: "" });
  const setTime = (h: OpeningHours, k: "open_time" | "close_time", v: string) => v && v !== hhmm(h[k]) && call(() => saveRow("opening_hours", h.weekday, { [k]: v }), `${DAYS[h.weekday - 1]}: ${k === "open_time" ? "apre" : "chiude"} alle ${v}`);

  return (
    <>
      <PageTitle title="Orari" subtitle="Settimana tipo e giorni speciali" />
      <Card className="!p-2">
        <ul className="divide-y divide-chocolate/5">
          {hours.map((h) => (
            <li key={h.weekday} className="flex flex-wrap items-center gap-2 px-2 py-2.5">
              <span className="w-24 font-bold">{DAYS[h.weekday - 1]}</span>
              <div className={`flex flex-1 items-center gap-2 ${h.is_closed ? "opacity-30" : ""}`}>
                <input type="time" defaultValue={hhmm(h.open_time)} disabled={h.is_closed} onBlur={(e) => setTime(h, "open_time", e.target.value)} className={`${inputCls} !min-h-11 w-28 tabular-nums`} aria-label="Apre" />
                <span>–</span>
                <input type="time" defaultValue={hhmm(h.close_time)} disabled={h.is_closed} onBlur={(e) => setTime(h, "close_time", e.target.value)} className={`${inputCls} !min-h-11 w-28 tabular-nums`} aria-label="Chiude" />
              </div>
              <span className="text-xs font-bold text-chocolate/60">{h.is_closed ? "Chiuso" : "Aperto"}</span>
              <Toggle checked={!h.is_closed} label="Aperto" onChange={(v) => call(() => saveRow("opening_hours", h.weekday, { is_closed: !v }), `${DAYS[h.weekday - 1]}: ${v ? "aperto" : "chiuso"}`)} />
            </li>
          ))}
        </ul>
      </Card>

      <h2 className="mt-8 mb-2 font-display text-xl font-bold">Giorni speciali e chiusure</h2>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data">
            <input type="date" value={newDay.date} onChange={(e) => setNewDay({ ...newDay, date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Nota (es. Ferragosto)">
            <input value={newDay.note} onChange={(e) => setNewDay({ ...newDay, note: e.target.value })} className={inputCls} />
          </Field>
          <div className={`flex items-end gap-2 ${newDay.is_closed ? "opacity-30" : ""}`}>
            <Field label="Apre">
              <input type="time" value={newDay.open_time} disabled={newDay.is_closed} onChange={(e) => setNewDay({ ...newDay, open_time: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Chiude">
              <input type="time" value={newDay.close_time} disabled={newDay.is_closed} onChange={(e) => setNewDay({ ...newDay, close_time: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="flex items-end justify-between gap-2">
            <span className="flex items-center gap-2 pb-2 font-bold">
              <Toggle checked={newDay.is_closed} tone="cherry" onChange={(v) => setNewDay({ ...newDay, is_closed: v })} /> Chiuso tutto il giorno
            </span>
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          disabled={!newDay.date}
          onClick={async () => {
            const ok = await call(
              () =>
                createRowAction("special_days", {
                  date: newDay.date,
                  note: newDay.note ? { it: newDay.note } : {},
                  open_time: newDay.is_closed ? null : newDay.open_time,
                  close_time: newDay.is_closed ? null : newDay.close_time,
                  is_closed: newDay.is_closed,
                }),
              "Giorno speciale salvato",
            );
            if (ok !== undefined) setNewDay({ ...newDay, date: "", note: "" });
          }}
        >
          <Plus weight="bold" className="size-5" /> Aggiungi giorno speciale
        </Button>
        {special.length > 0 && (
          <ul className="mt-4 divide-y divide-chocolate/5">
            {special.map((d) => (
              <li key={d.date} className="flex items-center justify-between gap-2 py-2 font-bold">
                <span>
                  {new Date(`${d.date}T12:00:00`).toLocaleDateString("it", { weekday: "short", day: "numeric", month: "long" })}
                  {d.note?.it && <span className="text-chocolate/50"> · {d.note.it}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{d.is_closed ? "Chiuso" : `${hhmm(d.open_time)}–${hhmm(d.close_time)}`}</span>
                  <Button variant="danger" label="Elimina" onClick={() => call(() => deleteRowAction("special_days", d.date), "Tolto")}>
                    <Trash weight="bold" className="size-5" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

"use client";

import { Megaphone, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { createRowAction, deleteRowAction, saveRow, translateAction } from "@/app/admin/actions";
import type { Announcement } from "@/lib/shared";
import { Button, Card, ColorField, Field, inputCls, PageTitle, Toggle, useAction } from "../ui";

export function BannerAdmin({ items }: { items: Announcement[] }) {
  const { call } = useAction();
  const [text, setText] = useState("");
  const [color, setColor] = useState("#FFE066");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const tr = await translateAction(text);
    const ok = await call(
      () =>
        createRowAction("announcements", {
          text: tr.ok && tr.data ? { ...tr.data, it: text } : { it: text },
          color,
          starts_at: new Date().toISOString(),
          ends_at: until ? new Date(until).toISOString() : null,
          is_active: true,
        }),
      "Banner pubblicato!",
    );
    setBusy(false);
    if (ok !== undefined) {
      setText("");
      setUntil("");
    }
  };

  return (
    <>
      <PageTitle title="Banner" subtitle="Un messaggio in cima al sito, tradotto in automatico" />
      <Card>
        <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center font-display text-lg font-semibold" style={{ background: color }}>
          <Megaphone weight="duotone" className="size-6" /> {text || "Nuovo gusto: Mirto!"}
        </div>
        <div className="space-y-3">
          <Field label="Testo (in italiano)">
            <input value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder="Oggi 2x1 sulle coppette fino alle 18!" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Colore" value={color} onChange={setColor} />
            <Field label="Fino a (facoltativo)">
              <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Button onClick={publish} disabled={busy || !text.trim()} className="w-full">
            {busy ? "Traduco e pubblico…" : "Pubblica"}
          </Button>
        </div>
      </Card>

      {items.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 font-display text-xl font-bold">Banner</h2>
          <Card className="!p-2">
            <ul className="divide-y divide-chocolate/5">
              {items.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-2 py-2.5">
                  <span className="size-4 shrink-0 rounded-full" style={{ background: a.color }} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-bold ${a.is_active ? "" : "text-chocolate/40"}`}>{a.text.it}</span>
                    {a.ends_at && <span className="text-xs font-semibold text-chocolate/50">fino a {new Date(a.ends_at).toLocaleString("it", { dateStyle: "short", timeStyle: "short" })}</span>}
                  </span>
                  <Toggle checked={a.is_active} label="Attivo" onChange={(v) => call(() => saveRow("announcements", a.id, { is_active: v }), v ? "Banner attivo" : "Banner tolto")} />
                  <Button variant="danger" label="Elimina" onClick={() => call(() => deleteRowAction("announcements", a.id), "Eliminato")}>
                    <Trash weight="bold" className="size-5" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}


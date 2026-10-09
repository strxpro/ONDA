"use client";

import { Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { createRowAction, deleteRowAction, saveRow, uploadImageAction } from "@/app/admin/actions";
import { PRICE_GROUPS, type PriceItem } from "@/lib/shared";
import { Button, Card, Field, I18nEditor, inputCls, PageTitle, Sheet, Toggle, useAction } from "../ui";

const GROUP_LABEL: Record<string, string> = { coni: "Coni", coppette: "Coppette", vaschette: "Vaschette", extra: "Extra", delizie: "Altre delizie" };

export function PricesAdmin({ prices }: { prices: PriceItem[] }) {
  const { call } = useAction();
  const [edit, setEdit] = useState<PriceItem | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const savePrice = (p: PriceItem) => {
    const raw = draft[p.id];
    if (raw == null) return;
    const v = Number(raw.replace(",", "."));
    if (!Number.isFinite(v) || v < 0) return;
    if (v !== p.price_eur) call(() => saveRow("price_items", p.id, { price_eur: Math.round(v * 100) / 100 }), `${p.label.it}: € ${v.toFixed(2)}`);
    setDraft((d) => {
      const { [p.id]: _, ...rest } = d;
      return rest;
    });
  };

  return (
    <>
      <PageTitle
        title="Prezzi"
        subtitle="Tocca un prezzo, scrivi, premi invio"
        action={
          <Button
            onClick={() =>
              call(() => createRowAction("price_items", { slug: `voce-${Date.now()}`, label: { it: "Nuova voce" }, price_group: "extra", size: null, max_scoops: null, price_eur: 0, sort_order: 999, is_active: false, image_url: null, description: null }), "Voce aggiunta (nascosta)")
            }
          >
            <Plus weight="bold" className="size-5" /> Voce
          </Button>
        }
      />
      <div className="space-y-6">
        {PRICE_GROUPS.map((g) => {
          const items = prices.filter((p) => p.price_group === g);
          if (!items.length) return null;
          return (
            <section key={g}>
              <h2 className="mb-2 font-display text-xl font-bold">{GROUP_LABEL[g]}</h2>
              <Card className="!p-2">
                <ul className="divide-y divide-chocolate/5">
                  {items.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 px-2 py-2">
                      <button type="button" onClick={() => setEdit(p)} className={`min-w-0 flex-1 text-left font-bold ${p.is_active ? "" : "text-chocolate/40"}`}>
                        <span className="block truncate">{p.label.it}</span>
                        {p.max_scoops && <span className="text-xs text-chocolate/50">{p.max_scoops} palline</span>}
                      </button>
                      <div className="relative w-28">
                        <span className="absolute top-1/2 left-3 -translate-y-1/2 font-bold text-chocolate/50">€</span>
                        <input
                          inputMode="decimal"
                          value={draft[p.id] ?? p.price_eur.toFixed(2)}
                          onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                          onBlur={() => savePrice(p)}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          className={`${inputCls} pl-7 text-right font-display text-lg tabular-nums`}
                          aria-label={`Prezzo ${p.label.it}`}
                        />
                      </div>
                      <Toggle checked={p.is_active} label="Visibile" onChange={(v) => call(() => saveRow("price_items", p.id, { is_active: v }), v ? "Visibile" : "Nascosto")} />
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          );
        })}
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.label.it ?? ""}>
        {edit && <PriceEditor key={edit.id} item={edit} onDone={() => setEdit(null)} />}
      </Sheet>
    </>
  );
}

function PriceEditor({ item, onDone }: { item: PriceItem; onDone: () => void }) {
  const { call } = useAction();
  const [p, setP] = useState(item);
  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = (await call(() => uploadImageAction(fd), "Foto caricata")) as { url: string } | undefined;
    if (res) setP((x) => ({ ...x, image_url: res.url }));
  };
  return (
    <div className="space-y-4">
      <I18nEditor label="Nome" value={p.label} onChange={(v) => setP({ ...p, label: v })} />
      {p.price_group === "delizie" && (
        <>
          <I18nEditor label="Descrizione breve" value={p.description ?? {}} onChange={(v) => setP({ ...p, description: v })} />
          <Field label="Foto" hint="Prezzo 0 = il prezzo non viene mostrato">
            <div className="flex items-center gap-3">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" className="size-16 rounded-full object-cover" />
              )}
              <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 font-bold">
                <UploadSimple weight="bold" className="size-5" /> Carica
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            </div>
          </Field>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gruppo">
          <select value={p.price_group} onChange={(e) => setP({ ...p, price_group: e.target.value as PriceItem["price_group"] })} className={inputCls}>
            {PRICE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {GROUP_LABEL[g]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Palline massime" hint="Per «Crea il tuo cono»">
          <input type="number" min={0} max={6} value={p.max_scoops ?? 0} onChange={(e) => setP({ ...p, max_scoops: Number(e.target.value) || null })} className={inputCls} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button
          variant="danger" label="Elimina"
          onClick={async () => {
            if (confirm("Eliminare questa voce?") && (await call(() => deleteRowAction("price_items", item.id), "Eliminata")) !== undefined) onDone();
          }}
        >
          <Trash weight="bold" className="size-5" />
        </Button>
        <Button
          className="flex-1"
          onClick={async () => {
            const { id: _id, ...patch } = p;
            if ((await call(() => saveRow("price_items", item.id, patch))) !== undefined) onDone();
          }}
        >
          Salva
        </Button>
      </div>
    </div>
  );
}

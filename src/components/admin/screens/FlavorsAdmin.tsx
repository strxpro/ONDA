"use client";

import { PencilSimple, Plus, Sparkle, Star, Trash, UploadSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { addFlavorAction, deleteRowAction, reorderAction, saveRow, uploadImageAction } from "@/app/admin/actions";
import { FLAVOR_CATEGORIES, FLAVOR_TAGS, SCOOP_TEXTURES, type Flavor } from "@/lib/shared";
import { IceCream } from "../../ice/IceCream";
import { ScoopImg, scoopPhoto } from "../../ice/PhotoStack";
import { Scoop } from "../../ice/Scoop";
import { TagIcon } from "../../ui/TagIcon";
import { SortableList } from "../Sortable";
import { Button, Card, ColorField, Field, I18nEditor, inputCls, PageTitle, Sheet, Toggle, useAction } from "../ui";

const TAG_LABEL: Record<string, string> = { vegan: "Vegano", gluten_free: "Senza glutine", lactose_free: "Senza lattosio", new: "Novità", signature: "Firma" };
const TEXTURE_LABEL: Record<string, string> = { smooth: "Liscio", chunks: "Con pezzi", swirl: "Variegato" };

export function FlavorsAdmin({ flavors }: { flavors: Flavor[] }) {
  const { call } = useAction();
  const [edit, setEdit] = useState<Flavor | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageTitle
        title="Gusti"
        subtitle="Trascina per riordinare · interruttore = disponibile oggi"
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus weight="bold" className="size-5" /> Nuovo
          </Button>
        }
      />
      <SortableList
        items={flavors}
        getId={(f) => f.id}
        onReorder={(ids) => call(() => reorderAction("flavors", ids), "Ordine salvato")}
        render={(f, handle) => (
          <Card className="!p-2">
            <div className="flex items-center gap-2">
              {handle}
              {scoopPhoto(f) ? (
                <span className={`block h-9 w-11 shrink-0 ${f.is_available_today ? "" : "grayscale"}`}>
                  <ScoopImg src={scoopPhoto(f)!} />
                </span>
              ) : (
                <Scoop color={f.color_primary} color2={f.color_secondary} texture={f.scoop_texture} className={`w-11 shrink-0 ${f.is_available_today ? "" : "grayscale"}`} />
              )}
              <button type="button" onClick={() => setEdit(f)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1.5 font-display text-lg font-semibold">
                  <span className="truncate">{f.name.it}</span>
                  {f.is_featured && <Star weight="fill" className="size-4 shrink-0 text-mango" />}
                </span>
                <span className="flex gap-1 text-chocolate/60">
                  {f.tags.map((t) => (
                    <TagIcon key={t} tag={t} className="size-4" />
                  ))}
                  <span className="text-xs font-bold">{f.is_available_today ? "Disponibile" : "Finito oggi"}</span>
                </span>
              </button>
              <button type="button" onClick={() => setEdit(f)} className="grid size-11 place-items-center rounded-xl text-chocolate/60" aria-label="Modifica">
                <PencilSimple weight="bold" className="size-5" />
              </button>
              <Toggle checked={f.is_available_today} label="Disponibile oggi" onChange={(v) => call(() => saveRow("flavors", f.id, { is_available_today: v }), v ? `${f.name.it}: disponibile` : `${f.name.it}: finito!`)} />
            </div>
          </Card>
        )}
      />

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.name.it ?? ""}>
        {edit && <FlavorEditor key={edit.id} flavor={edit} onDone={() => setEdit(null)} />}
      </Sheet>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Nuovo gusto">
        <NewFlavor onDone={() => setAdding(false)} />
      </Sheet>
    </>
  );
}

function NewFlavor({ onDone }: { onDone: () => void }) {
  const { call, pending } = useAction();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<Flavor["tags"]>([]);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const ok = await call(() => addFlavorAction({ name, description: description || undefined, tags }), `${name} aggiunto!`);
    setBusy(false);
    if (ok !== undefined) onDone();
  };
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-2xl bg-blueberry-soft p-3 text-sm font-semibold">
        <Sparkle weight="fill" className="mt-0.5 size-5 shrink-0" /> Scrivi in italiano: nome e descrizione vengono tradotti in 5 lingue e il colore viene scelto in automatico. Il gusto sarà segnato come «Novità».
      </p>
      <Field label="Nome">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Es. Mirto" autoFocus />
      </Field>
      <Field label="Descrizione (facoltativa)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
      </Field>
      <TagPicker value={tags} onChange={setTags} />
      <Button onClick={submit} disabled={busy || pending || !name.trim()} className="w-full">
        {busy ? "Sto preparando il gusto…" : "Aggiungi"}
      </Button>
    </div>
  );
}

function TagPicker({ value, onChange }: { value: Flavor["tags"]; onChange: (v: Flavor["tags"]) => void }) {
  return (
    <Field label="Etichette">
      <div className="flex flex-wrap gap-2">
        {FLAVOR_TAGS.map((t) => {
          const on = value.includes(t);
          return (
            <button key={t} type="button" onClick={() => onChange(on ? value.filter((x) => x !== t) : [...value, t])} className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold ${on ? "bg-chocolate text-cream" : "bg-white"}`}>
              <TagIcon tag={t} className="size-4" /> {TAG_LABEL[t]}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function FlavorEditor({ flavor, onDone }: { flavor: Flavor; onDone: () => void }) {
  const { call, pending } = useAction();
  const [f, setF] = useState(flavor);
  const set = <K extends keyof Flavor>(k: K, v: Flavor[K]) => setF((x) => ({ ...x, [k]: v }));

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = (await call(() => uploadImageAction(fd), "Foto caricata")) as { url: string } | undefined;
    if (res) set("image_url", res.url);
  };

  return (
    <div className="space-y-5">
      {/* live preview */}
      <div className="flex items-center gap-4 rounded-3xl p-4" style={{ background: `radial-gradient(circle at 30% 40%, #fff, ${f.color_primary}55)` }}>
        <IceCream scoops={[{ color: f.color_primary, color2: f.color_secondary, texture: f.scoop_texture }]} drips className="w-20 shrink-0" style={{ filter: `drop-shadow(0 12px 10px ${f.color_primary}aa)` }} />
        <div>
          <p className="font-display text-2xl font-bold">{f.name.it || "—"}</p>
          <p className="text-sm font-semibold text-chocolate/60">Anteprima dal vivo</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white p-3">
        <span className="font-bold">Disponibile oggi</span>
        <Toggle checked={f.is_available_today} onChange={(v) => set("is_available_today", v)} />
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white p-3">
        <span className="font-bold">In evidenza (riquadro grande)</span>
        <Toggle checked={f.is_featured} onChange={(v) => set("is_featured", v)} />
      </div>

      <I18nEditor label="Nome" value={f.name} onChange={(v) => set("name", v)} />
      <I18nEditor label="Descrizione" value={f.description} onChange={(v) => set("description", v)} multiline />
      <I18nEditor label="Ingredienti" value={f.ingredients} onChange={(v) => set("ingredients", v)} />

      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Colore" value={f.color_primary} onChange={(v) => set("color_primary", v)} />
        <ColorField label="Colore pezzi / variegato" value={f.color_secondary} onChange={(v) => set("color_secondary", v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Consistenza">
          <select value={f.scoop_texture} onChange={(e) => set("scoop_texture", e.target.value as Flavor["scoop_texture"])} className={inputCls}>
            {SCOOP_TEXTURES.map((t) => (
              <option key={t} value={t}>
                {TEXTURE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Categoria">
          <select value={f.category} onChange={(e) => set("category", e.target.value as Flavor["category"])} className={inputCls}>
            {FLAVOR_CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <TagPicker value={f.tags} onChange={(v) => set("tags", v)} />

      <Field label="Foto (facoltativa, sostituisce il disegno)">
        <div className="flex items-center gap-3">
          {f.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.image_url} alt="" className="size-16 rounded-2xl object-cover" />
          )}
          <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 font-bold">
            <UploadSimple weight="bold" className="size-5" /> Carica
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {f.image_url && (
            <Button variant="ghost" onClick={() => set("image_url", null)}>
              Rimuovi
            </Button>
          )}
        </div>
      </Field>

      <div className="sticky bottom-0 -mx-5 flex gap-2 bg-cream/95 px-5 pt-3 backdrop-blur">
        <Button
          variant="danger" label="Elimina"
          onClick={async () => {
            if (!confirm(`Togliere «${flavor.name.it}» dal sito? (Si può annullare dalla Cronologia)`)) return;
            if ((await call(() => deleteRowAction("flavors", flavor.id), "Gusto tolto")) !== undefined) onDone();
          }}
        >
          <Trash weight="bold" className="size-5" />
        </Button>
        <Button
          className="flex-1"
          disabled={pending}
          onClick={async () => {
            const { id: _id, ...patch } = f;
            if ((await call(() => saveRow("flavors", flavor.id, patch))) !== undefined) onDone();
          }}
        >
          Salva
        </Button>
      </div>
    </div>
  );
}

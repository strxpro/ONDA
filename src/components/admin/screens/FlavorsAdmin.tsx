"use client";

import { CheckSquare, Crown, MagnifyingGlass, PencilSimple, Plus, Sparkle, Square, Star, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { addFlavorAction, deleteRowAction, reorderAction, saveRow, setSignatureAction, uploadImageAction } from "@/app/admin/actions";
import { FLAVOR_CATEGORIES, FLAVOR_TAGS, SCOOP_TEXTURES, type Flavor } from "@/lib/shared";
import { IceCream } from "../../ice/IceCream";
import { ScoopImg, scoopPhoto } from "../../ice/PhotoStack";
import { Scoop } from "../../ice/Scoop";
import { TagIcon } from "../../ui/TagIcon";
import { SortableList } from "../Sortable";
import { Button, Card, ColorField, Field, I18nEditor, inputCls, PageTitle, Sheet, Toggle, useAction } from "../ui";

const TAG_LABEL: Record<string, string> = { vegan: "Vegano", gluten_free: "Senza glutine", lactose_free: "Senza lattosio", new: "Novità", signature: "Firma" };
const TEXTURE_LABEL: Record<string, string> = { smooth: "Liscio", chunks: "Con pezzi", swirl: "Variegato" };

/** "pistàcchio" → "pistacchio": lowercase, no accents — so "tiramisu" finds "Tiramisù". */
const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const VIEWS = { all: "Tutti", on: "Disponibili", off: "Finiti", new: "Novità", firma: "Gusto firma" } as const;

/**
 * Smart search: every word must match somewhere — the name in any of the six languages, the ingredients,
 * the description, the category or a tag (e.g. "vegano frutta", "pistac", "senza latt", "finito").
 */
function matchesQuery(f: Flavor, q: string) {
  const hay = norm(
    [
      ...Object.values(f.name),
      ...Object.values(f.ingredients ?? {}),
      ...Object.values(f.description ?? {}),
      f.slug,
      f.category,
      ...f.tags.map((t) => `${t} ${TAG_LABEL[t] ?? ""}`),
      f.is_available_today ? "disponibile available" : "finito esaurito sold out",
    ].join(" "),
  );
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function FlavorsAdmin({ flavors }: { flavors: Flavor[] }) {
  const { call } = useAction();
  const [edit, setEdit] = useState<Flavor | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [view, setView] = useState<keyof typeof VIEWS>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const filtering = q.trim() !== "" || view !== "all";
  const shown = useMemo(
    () =>
      flavors.filter(
        (f) => matchesQuery(f, q) && (view === "all" || (view === "on" && f.is_available_today) || (view === "off" && !f.is_available_today) || (view === "new" && f.tags.includes("new"))),
      ),
    [flavors, q, view],
  );
  const toggle = (id: string) => setPicked((p) => (p.has(id) ? new Set([...p].filter((x) => x !== id)) : new Set([...p, id])));
  const removeOne = (f: Flavor) => confirm(`Eliminare «${f.name.it}» dal sito? (si può annullare da Cronologia)`) && call(() => deleteRowAction("flavors", f.id), `${f.name.it} eliminato`);
  const bulk = async (kind: "delete" | "off" | "on") => {
    const ids = [...picked];
    if (!ids.length) return;
    if (kind === "delete" && !confirm(`Eliminare ${ids.length} gusti dal sito?`)) return;
    await call(async () => {
      for (const id of ids) {
        const r = kind === "delete" ? await deleteRowAction("flavors", id) : await saveRow("flavors", id, { is_available_today: kind === "on" });
        if (!r.ok) return r;
      }
      return { ok: true as const };
    }, kind === "delete" ? `${ids.length} gusti eliminati` : "Fatto");
    setPicked(new Set());
  };

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
      {/* smart search + quick views */}
      <div className="sticky top-2 z-20 mb-3 space-y-2 rounded-2xl bg-cream/90 p-1 backdrop-blur">
        <label className="flex items-center gap-2 rounded-2xl border-2 border-chocolate/10 bg-white px-3 focus-within:border-pink">
          <MagnifyingGlass weight="bold" className="size-5 shrink-0 text-chocolate/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca: nome in ogni lingua, ingrediente, «vegano», «finito»…" className="min-h-12 w-full bg-transparent font-semibold outline-none" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Cancella" className="grid size-8 place-items-center rounded-full bg-chocolate/5">
              <X weight="bold" className="size-4" />
            </button>
          )}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((k) => (
            <button key={k} type="button" onClick={() => setView(k)} className={`rounded-full px-3 py-1.5 text-sm font-bold ${view === k ? "bg-chocolate text-cream" : "bg-white text-chocolate/70"}`}>
              {VIEWS[k]}
            </button>
          ))}
          <span className="ml-auto self-center text-sm font-bold text-chocolate/50">{shown.length} gusti</span>
        </div>
        {picked.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-chocolate p-2 text-cream">
            <span className="px-2 font-bold">{picked.size} selezionati</span>
            <button type="button" onClick={() => bulk("off")} className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">Finiti oggi</button>
            <button type="button" onClick={() => bulk("on")} className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">Disponibili</button>
            <button type="button" onClick={() => bulk("delete")} className="rounded-full bg-cherry px-3 py-1.5 text-sm font-bold">
              <Trash weight="bold" className="mr-1 inline size-4" />
              Elimina
            </button>
            <button type="button" onClick={() => setPicked(new Set())} className="ml-auto grid size-8 place-items-center rounded-full bg-white/15" aria-label="Annulla selezione">
              <X weight="bold" className="size-4" />
            </button>
          </div>
        )}
      </div>
      {filtering && !shown.length && <Card><p className="text-chocolate/60">Nessun gusto trovato.</p></Card>}
      <SortableList
        items={shown}
        getId={(f) => f.id}
        onReorder={(ids) => !filtering && call(() => reorderAction("flavors", ids), "Ordine salvato")}
        render={(f, handle) => (
          <Card className="!p-2">
            <div className="flex items-center gap-2">
              {filtering ? null : handle}
              <button type="button" onClick={() => toggle(f.id)} aria-label="Seleziona" className="grid size-9 shrink-0 place-items-center rounded-lg text-chocolate/50">
                {picked.has(f.id) ? <CheckSquare weight="fill" className="size-6 text-chocolate" /> : <Square weight="bold" className="size-6" />}
              </button>
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
              {/* the crown: make it the "gusto firma" (the big section of the site) */}
              <button
                type="button"
                onClick={() => !f.tags.includes("signature") && call(() => setSignatureAction(f.id), `${f.name.it} è il gusto firma`)}
                className={`grid size-11 place-items-center rounded-xl transition-colors ${f.tags.includes("signature") ? "bg-lemon text-chocolate" : "text-chocolate/35 hover:bg-lemon-soft hover:text-chocolate"}`}
                aria-label="Gusto firma"
                title={f.tags.includes("signature") ? "Gusto firma" : "Rendi gusto firma"}
              >
                <Crown weight={f.tags.includes("signature") ? "fill" : "bold"} className="size-5" />
              </button>
              <button type="button" onClick={() => removeOne(f)} className="grid size-11 place-items-center rounded-xl text-cherry/70 hover:bg-cherry/10" aria-label="Elimina">
                <Trash weight="bold" className="size-5" />
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

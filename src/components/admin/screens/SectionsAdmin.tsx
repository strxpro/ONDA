"use client";

import { reorderAction, saveRow } from "@/app/admin/actions";
import type { Section } from "@/lib/shared";
import { SortableList } from "../Sortable";
import { Card, PageTitle, Toggle, useAction } from "../ui";

const LABEL: Record<string, string> = {
  announcement: "Banner annunci",
  hero: "Apertura (Onda)",
  flavors: "I gusti di oggi",
  lab: "Il Laboratorio (galleria)",
  configurator: "Crea il tuo cono",
  signature: "Yellow Submarine",
  prices: "Altre delizie",
  reviews: "Recensioni",
  visit: "Vieni a trovarci",
  footer: "Piè di pagina",
};

export function SectionsAdmin({ sections }: { sections: Section[] }) {
  const { call } = useAction();
  return (
    <>
      <PageTitle title="Sezioni" subtitle="Trascina per cambiare l'ordine, spegni per nascondere" />
      <SortableList
        items={sections}
        getId={(s) => s.key}
        onReorder={(keys) => call(() => reorderAction("sections", keys), "Ordine salvato")}
        render={(s, handle) => (
          <Card className="!p-2">
            <div className="flex items-center gap-2">
              {handle}
              <span className={`flex-1 font-display text-lg font-semibold ${s.is_visible ? "" : "text-chocolate/40"}`}>{LABEL[s.key] ?? s.key}</span>
              <Toggle checked={s.is_visible} label="Visibile" onChange={(v) => call(() => saveRow("sections", s.key, { is_visible: v }), v ? "Sezione visibile" : "Sezione nascosta")} />
            </div>
          </Card>
        )}
      />
    </>
  );
}

import type { Flavor } from "@/lib/shared";
import { ALLERGENS, type Allergen } from "@/lib/shared";

/**
 * Allergen badges in the site's candy style: a glossy colored disc with a simple white symbol.
 * The owner's own list wins (admin / Telegram); without it we read the ingredients and say "probably" (and always
 * "ask at the counter") — never a promise.
 */
const STYLE: Record<Allergen, { from: string; to: string; label: Record<string, string> }> = {
  milk: { from: "#8EC5FF", to: "#4F8FE0", label: { it: "Latte", pl: "Mleko", en: "Milk", es: "Leche", de: "Milch", fr: "Lait" } },
  eggs: { from: "#FFD66B", to: "#F0A92E", label: { it: "Uova", pl: "Jaja", en: "Eggs", es: "Huevo", de: "Eier", fr: "Œufs" } },
  nuts: { from: "#C99A6B", to: "#8C5A33", label: { it: "Frutta a guscio", pl: "Orzechy", en: "Tree nuts", es: "Frutos de cáscara", de: "Schalenfrüchte", fr: "Fruits à coque" } },
  peanuts: { from: "#E0B07A", to: "#B07A3E", label: { it: "Arachidi", pl: "Orzeszki ziemne", en: "Peanuts", es: "Cacahuetes", de: "Erdnüsse", fr: "Arachides" } },
  gluten: { from: "#F2D27A", to: "#C99A2E", label: { it: "Glutine", pl: "Gluten", en: "Gluten", es: "Gluten", de: "Gluten", fr: "Gluten" } },
  soy: { from: "#A8DB7A", to: "#5FA640", label: { it: "Soia", pl: "Soja", en: "Soy", es: "Soja", de: "Soja", fr: "Soja" } },
  sesame: { from: "#F1E1B8", to: "#C9AA6B", label: { it: "Sesamo", pl: "Sezam", en: "Sesame", es: "Sésamo", de: "Sesam", fr: "Sésame" } },
  sulphites: { from: "#C9A0E8", to: "#8A5BB8", label: { it: "Solfiti", pl: "Siarczyny", en: "Sulphites", es: "Sulfitos", de: "Sulfite", fr: "Sulfites" } },
};

const GLYPH: Record<Allergen, React.ReactNode> = {
  milk: <path d="M10 5h4v2.2l1.6 2.4V19a1 1 0 0 1-1 1H9.4a1 1 0 0 1-1-1V9.6L10 7.2z M8.6 12.5h6.8" />,
  eggs: <path d="M12 4.5c3 0 5.2 5 5.2 8.6a5.2 5.2 0 0 1-10.4 0C6.8 9.5 9 4.5 12 4.5z" />,
  nuts: <path d="M12 5c3.6 0 6 2.6 6 6.4C18 15.6 15.3 19 12 19s-6-3.4-6-7.6C6 7.6 8.4 5 12 5z M8 9.5h8 M12 5v3" />,
  peanuts: <path d="M9.5 4.8a3.4 3.4 0 0 1 3.4 3.4c0 .9-.4 1.5-.4 2.4 0 .9.6 1.4.6 2.6a3.6 3.6 0 1 1-7.2 0c0-1.4.8-2 .8-3 0-1-.6-1.4-.6-2.2a3.4 3.4 0 0 1 3.4-3.2z" transform="translate(2.2 0)" />,
  gluten: <path d="M12 20V7 M12 9.5c-1.8-.2-3-1.4-3-3.2 1.8.2 3 1.4 3 3.2zm0 0c1.8-.2 3-1.4 3-3.2-1.8.2-3 1.4-3 3.2z M12 13.5c-1.8-.2-3-1.4-3-3.2 1.8.2 3 1.4 3 3.2zm0 0c1.8-.2 3-1.4 3-3.2-1.8.2-3 1.4-3 3.2z M12 17.5c-1.8-.2-3-1.4-3-3.2 1.8.2 3 1.4 3 3.2zm0 0c1.8-.2 3-1.4 3-3.2-1.8.2-3 1.4-3 3.2z" />,
  soy: <path d="M6.5 15.5c2.5-6.5 7.5-9 11-9-1 4.8-4.5 9.6-11 9z M9 13a1.4 1.4 0 1 0 0 .1 M12 11a1.4 1.4 0 1 0 0 .1 M15 9a1.4 1.4 0 1 0 0 .1" />,
  sesame: <path d="M8.5 9.5c1-1.8 2.6-1.8 3.2 0-.6 1.8-2.2 1.8-3.2 0z M12.3 14.5c1-1.8 2.6-1.8 3.2 0-.6 1.8-2.2 1.8-3.2 0z M7.5 15c1-1.8 2.6-1.8 3.2 0-.6 1.8-2.2 1.8-3.2 0z M13 8c1-1.8 2.6-1.8 3.2 0-.6 1.8-2.2 1.8-3.2 0z" />,
  sulphites: <path d="M9 4.5h6l-.8 5.5a2.2 2.2 0 0 1-4.4 0z M12 12v6 M9.5 19.5h5" />,
};

export function AllergenIcon({ a, className = "size-9" }: { a: Allergen; className?: string }) {
  const st = STYLE[a];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={`al-${a}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={st.from} />
          <stop offset="1" stopColor={st.to} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11.2" fill={`url(#al-${a})`} />
      <circle cx="12" cy="12" r="11.2" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" />
      <ellipse cx="8.4" cy="6.4" rx="4.2" ry="2.1" fill="#fff" opacity=".35" transform="rotate(-24 8.4 6.4)" />
      <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {GLYPH[a]}
      </g>
    </svg>
  );
}

export const allergenLabel = (a: Allergen, locale: string) => STYLE[a].label[locale] ?? STYLE[a].label.it;

/** "Senza lattosio": a white-blue disc with a crossed milk carton — shown on the scoop of every lactose-free flavor. */
export function LactoseFreeBadge({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11.2" fill="#FFF7EE" stroke="#4F8FE0" strokeWidth="1.6" />
      <path d="M10 6h4v2l1.4 2.2V17.6a.9.9 0 0 1-.9.9H9.5a.9.9 0 0 1-.9-.9V10.2L10 8z" fill="#8EC5FF" stroke="#4F8FE0" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5.5 18.5 18.5 5.5" stroke="#E5243F" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const RULES: [Allergen, RegExp][] = [
  ["milk", /latte|panna|ricott|mascarpone|yogurt|burro|formagg|fior di latte|milk|cream|butter|cheese|mlek|śmietan|smietan|masło|maslo|leche|nata|queso|milch|sahne|käse|lait|crème|creme|beurre/i],
  ["eggs", /uov|tuorl|egg|jaj|huevo|ei\b|eier|œuf|oeuf|meringa|zabaione/i],
  ["nuts", /pistac|nocciol|mandorl|\bnoc[ie]\b|anacard|pinol|nut|orzech|almond|hazel|walnut|cashew|avellan|almendr|nuez|haseln|mandel|walnuss|noisette|amande|gianduia|nutella/i],
  ["peanuts", /arachid|peanut|orzeszk|cacahuet|maní|erdnuss|cacahuète/i],
  ["gluten", /biscott|cialda|pan di spagna|farina|wafer|cookie|brownie|crumble|torta|frollin|cereal|ciast|herbat|biszkopt|galleta|bizcocho|keks|kuchen|biscuit|gâteau|gateau|tiramis|savoiard/i],
  ["soy", /\bsoi[ae]|soja|\bsoy/i],
  ["sesame", /sesam|sezam/i],
  ["sulphites", /\bvino|wine|\bwino|solfit|sulfit|siarczyn/i],
];

/** The flavor's allergens: the owner's list if set, else read from its ingredients (creams have milk). */
export function allergensOf(f: Pick<Flavor, "ingredients" | "category" | "allergens" | "tags">): { list: Allergen[]; guessed: boolean } {
  if (f.allergens?.length) return { list: f.allergens, guessed: false };
  const text = Object.values(f.ingredients ?? {}).join(" ");
  const found = new Set<Allergen>(RULES.filter(([, re]) => re.test(text)).map(([a]) => a));
  if ((f.category === "crema" || f.category === "speciali") && !f.tags.includes("lactose_free") && !f.tags.includes("vegan")) found.add("milk");
  return { list: ALLERGENS.filter((a) => found.has(a)), guessed: true };
}

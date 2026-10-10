/**
 * Browser-safe constants and helpers (no zod). Client components import from here;
 * the Zod schemas in ./types stay on the server.
 */
import type { I18nText, MotionSettings } from "./types";

export type {
  Announcement,
  Comment,
  Flavor,
  GalleryImage,
  I18nText,
  MotionSettings,
  OpeningHours,
  PriceItem,
  Review,
  Section,
  SiteData,
  SiteSettings,
  SpecialDay,
} from "./types";

export const LOCALES = ["it", "pl", "en", "es", "de", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";
export const LOCALE_NAMES: Record<Locale, string> = { it: "Italiano", pl: "Polski", en: "English", es: "Español", de: "Deutsch", fr: "Français" };

export const FLAVOR_CATEGORIES = ["crema", "frutta", "speciali", "sorbetti"] as const;
export const FLAVOR_TAGS = ["vegan", "gluten_free", "lactose_free", "new", "signature"] as const;
/** The EU allergens that matter in a gelateria. */
export const ALLERGENS = ["milk", "eggs", "nuts", "peanuts", "gluten", "soy", "sesame", "sulphites"] as const;
export type Allergen = (typeof ALLERGENS)[number];
export const SCOOP_TEXTURES = ["smooth", "chunks", "swirl"] as const;
export const PRICE_GROUPS = ["coni", "coppette", "vaschette", "extra", "delizie"] as const;
export const SECTION_KEYS = ["announcement", "hero", "flavors", "lab", "configurator", "signature", "prices", "reviews", "visit", "footer"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const DEFAULT_MOTION: MotionSettings = {
  intensity: 1,
  preloader: "full",
  smoothScroll: true,
  cursor: true,
  sprinkles: true,
  galleryInterval: 7,
  meltSpeed: 1,
};

/** Pick the text for a locale, falling back to Italian then English. */
export function t(text: Partial<I18nText> | null | undefined, locale: Locale): string {
  if (!text) return "";
  return text[locale] || text.it || text.en || "";
}

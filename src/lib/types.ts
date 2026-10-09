import { z } from "zod";
import { FLAVOR_CATEGORIES, FLAVOR_TAGS, PRICE_GROUPS, SCOOP_TEXTURES, SECTION_KEYS } from "./shared";

export { DEFAULT_LOCALE, DEFAULT_MOTION, FLAVOR_CATEGORIES, FLAVOR_TAGS, LOCALE_NAMES, LOCALES, PRICE_GROUPS, SCOOP_TEXTURES, SECTION_KEYS, t } from "./shared";
export type { Locale, SectionKey } from "./shared";

export const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a #RRGGBB color");

/** A text in every supported language. Italian is required, the rest fall back to it. */
export const I18nText = z.object({
  it: z.string(),
  pl: z.string().optional(),
  en: z.string().optional(),
  es: z.string().optional(),
  de: z.string().optional(),
  fr: z.string().optional(),
});
export type I18nText = z.infer<typeof I18nText>;
const I18nLoose = I18nText.partial({ it: true });


export const Flavor = z.object({
  id: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: I18nText,
  description: I18nLoose,
  ingredients: I18nLoose,
  color_primary: hex,
  color_secondary: hex,
  category: z.enum(FLAVOR_CATEGORIES),
  tags: z.array(z.enum(FLAVOR_TAGS)),
  is_available_today: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.number().int(),
  image_url: z.string().nullable(),
  scoop_texture: z.enum(SCOOP_TEXTURES),
  deleted_at: z.string().nullable(),
});
export type Flavor = z.infer<typeof Flavor>;

export const PriceItem = z.object({
  id: z.string(),
  slug: z.string(),
  label: I18nText,
  price_group: z.enum(PRICE_GROUPS),
  size: z.string().nullable(),
  max_scoops: z.number().int().min(1).max(6).nullable(),
  price_eur: z.coerce.number().min(0),
  sort_order: z.number().int(),
  is_active: z.boolean(),
  /** "delizie" only: photo + one line shown in the treats section */
  image_url: z.string().nullable().default(null),
  description: I18nText.nullable().default(null),
});
export type PriceItem = z.infer<typeof PriceItem>;

/** "HH:MM" or "HH:MM:SS" as returned by Postgres `time`. */
export const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

export const OpeningHours = z.object({
  weekday: z.number().int().min(1).max(7), // ISO: 1 = Monday
  open_time: time.nullable(),
  close_time: time.nullable(),
  is_closed: z.boolean(),
});
export type OpeningHours = z.infer<typeof OpeningHours>;

export const SpecialDay = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: I18nLoose,
  open_time: time.nullable(),
  close_time: time.nullable(),
  is_closed: z.boolean(),
});
export type SpecialDay = z.infer<typeof SpecialDay>;

export const Announcement = z.object({
  id: z.string(),
  text: I18nText,
  color: hex,
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  is_active: z.boolean(),
});
export type Announcement = z.infer<typeof Announcement>;

export const Section = z.object({
  key: z.enum(SECTION_KEYS),
  is_visible: z.boolean(),
  sort_order: z.number().int(),
});
export type Section = z.infer<typeof Section>;

export const GalleryImage = z.object({
  id: z.string(),
  image_url: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: I18nLoose,
  color: hex,
  sort_order: z.number().int(),
});
export type GalleryImage = z.infer<typeof GalleryImage>;

/** A real customer review, copied from (or synced with) its source. Never invented. */
export const Review = z.object({
  id: z.string(),
  source: z.enum(["google", "tripadvisor", "other"]),
  author: z.string(),
  rating: z.coerce.number().min(1).max(5),
  text: z.string(),
  language: z.string().nullable(),
  review_date: z.string().nullable(),
  url: z.string().nullable(),
  is_visible: z.boolean(),
  sort_order: z.number().int(),
});
export type Review = z.infer<typeof Review>;

export const COMMENT_STICKERS = ["heart", "star", "smile", "yum"] as const;
/** A visitor's comment left on the site; visible only once the owner approves it. */
export const Comment = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(40),
  message: z.string().trim().min(2).max(280),
  flavor_slug: z.string().max(60).nullable(),
  sticker: z.enum(COMMENT_STICKERS),
  /** 1–5 stars the visitor gave first; 1–3 are kept private for the owner unless they approve them */
  rating: z.coerce.number().int().min(1).max(5).nullable().default(null),
  locale: z.string().max(5).nullable(),
  status: z.enum(["pending", "approved", "rejected"]),
  created_at: z.string(),
});
export type Comment = z.infer<typeof Comment>;

/** A pre-order from the site (gelato by the kilo, a tub, treats) — private: only the owner sees it. */
export const Reservation = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(5).max(30),
  items: z.string().trim().min(1).max(500),
  pickup_at: z.string(),
  notes: z.string().max(400).nullable(),
  locale: z.string().max(5).nullable(),
  status: z.enum(["new", "confirmed", "declined", "done"]),
  created_at: z.string(),
});
export type Reservation = z.infer<typeof Reservation>;

/** Owner-tunable micro-animation settings (admin → "Animazioni", or by voice). */
export const MotionSettings = z.object({
  intensity: z.number().min(0).max(1.5).default(1), // 0 = static, 1 = default, 1.5 = extra playful
  preloader: z.enum(["full", "short", "off"]).default("full"),
  smoothScroll: z.boolean().default(true),
  cursor: z.boolean().default(true),
  sprinkles: z.boolean().default(true),
  galleryInterval: z.number().min(2).max(20).default(4.5), // seconds between gallery swaps
  meltSpeed: z.number().min(0.3).max(3).default(1), // >1 melts faster
});
export type MotionSettings = z.infer<typeof MotionSettings>;

export const SiteSettings = z.object({
  name: z.string(),
  tagline: I18nText,
  texts: z.record(z.string(), I18nText),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  maps_url: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  socials: z.record(z.string(), z.string()),
  rating_google: z.coerce.number().min(0).max(5).nullable(),
  rating_google_count: z.number().int().nullable(),
  rating_google_url: z.string().nullable(),
  /** direct "write a review" link (search.google.com/local/writereview?placeid=…); falls back to rating_google_url */
  google_review_url: z.string().nullable().default(null),
  rating_tripadvisor: z.coerce.number().min(0).max(5).nullable(),
  rating_tripadvisor_count: z.number().int().nullable(),
  rating_tripadvisor_url: z.string().nullable(),
  theme: z.record(z.string(), hex),
  motion: MotionSettings,
  timezone: z.string(),
});
export type SiteSettings = z.infer<typeof SiteSettings>;

/** Everything the public page needs, in one object. */
export type SiteData = {
  settings: SiteSettings;
  flavors: Flavor[];
  prices: PriceItem[];
  hours: OpeningHours[];
  specialDays: SpecialDay[];
  announcements: Announcement[];
  sections: Section[];
  gallery: GalleryImage[];
  reviews: Review[];
  /** approved visitor comments, newest first */
  comments: Comment[];
};

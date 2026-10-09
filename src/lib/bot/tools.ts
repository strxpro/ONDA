import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { FLAVOR_CATEGORIES, FLAVOR_TAGS, SECTION_KEYS } from "../types";

export const TEXT_KEYS = ["hero_title", "hero_subtitle", "cta_flavors", "cta_directions", "flavors_title", "flavors_subtitle", "lab_title", "lab_body", "lab_point_1", "lab_point_2", "lab_point_3", "configurator_title", "configurator_subtitle", "signature_title", "signature_body", "prices_title", "treats_subtitle", "reviews_title", "visit_title", "visit_body", "marquee", "footer_text"] as const;

/**
 * Tools the bot can use. READ tools run immediately; WRITE tools are only *staged* and the
 * owner must press ✅ before anything changes. Inputs are validated with Zod before use.
 */

const s = (description: string) => ({ type: "string", description });
const obj = (properties: Record<string, unknown>, required: string[] = []): Anthropic.Beta.BetaTool["input_schema"] => ({ type: "object", properties, required, additionalProperties: false });

export const READ_TOOLS = ["get_stats", "list_flavors", "list_prices", "get_hours", "list_comments"] as const;

const usePhoto = { type: "boolean", description: "true to use the photo the owner sent with this message" };
const category = { type: "string", enum: [...FLAVOR_CATEGORIES], description: "crema = creamy, frutta = fruit, speciali = specials, sorbetti = sorbets" };

export const TOOL_DEFS: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_stats",
    description: "Website visit statistics: visits, unique visitors (people), top pages, devices, countries. 'today' starts at midnight in Sardinia.",
    input_schema: obj({ period: { type: "string", enum: ["today", "yesterday", "7d", "30d"] } }, ["period"]),
  },
  { name: "list_flavors", description: "List flavors with availability.", input_schema: obj({ onlyAvailable: { type: "boolean" } }) },
  { name: "list_prices", description: "List the price board.", input_schema: obj({}) },
  { name: "get_hours", description: "Weekly opening hours and upcoming special days.", input_schema: obj({}) },
  { name: "list_comments", description: "Visitors' comments waiting for approval (they appear on the site only once approved).", input_schema: obj({}) },
  {
    name: "set_flavor_availability",
    description: "Mark a flavor as sold out today (available=false) or back in the counter (available=true).",
    input_schema: obj({ flavor: s("flavor name in any language"), available: { type: "boolean" } }, ["flavor", "available"]),
  },
  {
    name: "add_flavor",
    description: "Add a new flavor. Name/description in the language the owner used; it is translated automatically and gets a realistic color. It is marked 'new'.",
    input_schema: obj(
      {
        name: s("flavor name, e.g. 'Mirto'"),
        description: s("optional short description"),
        ingredients: s("optional comma-separated ingredients, e.g. 'mirto, latte, panna'"),
        category,
        use_photo: usePhoto,
        color: s("optional #RRGGBB if the owner named a color (e.g. viola → #9B6BD3)"),
        tags: { type: "array", items: { type: "string", enum: [...FLAVOR_TAGS] } },
        featured: { type: "boolean", description: "show it in the big featured tile" },
      },
      ["name"],
    ),
  },
  {
    name: "update_flavor",
    description: "Change an existing flavor: rename, new description, color, tags, featured.",
    input_schema: obj(
      {
        flavor: s("current flavor name"),
        new_name: s("optional new name"),
        description: s("optional new description"),
        ingredients: s("optional comma-separated ingredients"),
        category,
        use_photo: usePhoto,
        color: s("optional #RRGGBB"),
        tags: { type: "array", items: { type: "string", enum: [...FLAVOR_TAGS] } },
        featured: { type: "boolean" },
      },
      ["flavor"],
    ),
  },
  { name: "remove_flavor", description: "Remove a flavor from the website (soft delete; can be undone).", input_schema: obj({ flavor: s("flavor name") }, ["flavor"]) },
  {
    name: "replace_today_flavors",
    description: "Set the complete list of today's flavors: those listed become available, all others sold out; unknown names are added as new flavors.",
    input_schema: obj({ flavors: { type: "array", items: { type: "string" }, minItems: 1 } }, ["flavors"]),
  },
  {
    name: "update_price",
    description: "Change a price on the price board (cones, cups, tubs, extras).",
    input_schema: obj({ item: s("price item name, e.g. 'cono medio', 'coppetta grande', 'vaschetta 1 kg'"), price_eur: { type: "number" } }, ["item", "price_eur"]),
  },
  {
    name: "add_menu_item",
    description: "Add something else the shop serves, shown in 'Altre delizie' (affogato, frappè, granita, crêpe…) or a take-away tub/extra. Translated automatically. Price 0 or missing = no price shown.",
    input_schema: obj(
      {
        name: s("item name"),
        description: s("optional one short line"),
        price_eur: { type: "number" },
        group: { type: "string", enum: ["delizie", "vaschette", "extra"], description: "delizie = treats section (default)" },
        use_photo: usePhoto,
      },
      ["name"],
    ),
  },
  {
    name: "update_menu_item",
    description: "Change a menu item (treat, tub, extra): rename, new description, show/hide, new photo. For prices use update_price.",
    input_schema: obj({ item: s("current item name"), new_name: s("optional"), description: s("optional"), visible: { type: "boolean" }, use_photo: usePhoto }, ["item"]),
  },
  {
    name: "add_gallery_photo",
    description: "Add the photo the owner sent to the website gallery (Il Laboratorio). Use when he sends a photo of the shop, the counter, people, gelato… that is not for a specific flavor or treat.",
    input_schema: obj({ caption: s("optional short caption") }),
  },
  {
    name: "moderate_comment",
    description: "Publish (approve=true) or discard (approve=false) visitors' comments. 'comment' = a few words of it or the author's name, or 'all' for every pending comment.",
    input_schema: obj({ comment: s("words from the comment, the author, or 'all'"), approve: { type: "boolean" } }, ["comment", "approve"]),
  },
  {
    name: "set_text",
    description: "Change a text on the website (titles, subtitles, the workshop story, the moving ribbon, footer…). Translated automatically.",
    input_schema: obj({ key: { type: "string", enum: [...TEXT_KEYS] }, text: s("the new text as the owner said it") }, ["key", "text"]),
  },
  {
    name: "set_hours",
    description: "Change opening hours for a weekday (1=Monday … 7=Sunday, every week) OR for one specific date (YYYY-MM-DD, e.g. 'tomorrow'). Times are HH:MM 24h. Use closed=true to close all day.",
    input_schema: obj(
      {
        weekday: { type: "integer", minimum: 1, maximum: 7 },
        date: s("YYYY-MM-DD"),
        open: s("HH:MM"),
        close: s("HH:MM"),
        closed: { type: "boolean" },
        note: s("optional note shown on the site, e.g. 'Ferragosto'"),
      },
      [],
    ),
  },
  {
    name: "set_banner",
    description: "Show an announcement banner on the website (replaces the current one). Translated automatically.",
    input_schema: obj({ text: s("banner text as the owner said it"), until: s("optional ISO datetime with timezone when it should disappear") }, ["text"]),
  },
  { name: "clear_banner", description: "Remove the announcement banner.", input_schema: obj({}) },
  {
    name: "toggle_section",
    description: "Show or hide a whole section of the website.",
    input_schema: obj({ section: { type: "string", enum: [...SECTION_KEYS] }, visible: { type: "boolean" } }, ["section", "visible"]),
  },
  {
    name: "set_motion",
    description: "Tune the website's animations.",
    input_schema: obj({
      intensity: { type: "number", minimum: 0, maximum: 1.5, description: "0 static, 1 normal, 1.5 extra" },
      preloader: { type: "string", enum: ["full", "short", "off"] },
      galleryInterval: { type: "number", minimum: 2, maximum: 20 },
      meltSpeed: { type: "number", minimum: 0.3, maximum: 3 },
      cursor: { type: "boolean" },
      sprinkles: { type: "boolean" },
      smoothScroll: { type: "boolean" },
    }),
  },
  { name: "undo_last", description: "Undo the most recent change to the website.", input_schema: obj({}) },
  {
    name: "ask_choice",
    description: "Ask the owner ONE short clarifying question with 2-4 button options, when the request is ambiguous. Use the owner's language.",
    input_schema: obj({ question: s("the question"), options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 } }, ["question", "options"]),
  },
];

const hexOpt = z.string().regex(/^#[0-9a-fA-F]{6}$/).optional();
const tags = z.array(z.enum(FLAVOR_TAGS)).optional();
const hhmm = z.string().regex(/^\d{1,2}[:.]\d{2}$/).transform((v) => v.replace(".", ":").padStart(5, "0"));

export const TOOL_INPUT = {
  get_stats: z.object({ period: z.enum(["today", "yesterday", "7d", "30d"]) }),
  list_flavors: z.object({ onlyAvailable: z.boolean().optional() }),
  list_prices: z.object({}),
  get_hours: z.object({}),
  list_comments: z.object({}),
  set_flavor_availability: z.object({ flavor: z.string().min(1), available: z.boolean() }),
  add_flavor: z.object({ name: z.string().min(1).max(60), description: z.string().max(300).optional(), ingredients: z.string().max(200).optional(), category: z.enum(FLAVOR_CATEGORIES).optional(), use_photo: z.boolean().optional(), color: hexOpt, tags, featured: z.boolean().optional() }),
  update_flavor: z.object({ flavor: z.string().min(1), new_name: z.string().max(60).optional(), description: z.string().max(300).optional(), ingredients: z.string().max(200).optional(), category: z.enum(FLAVOR_CATEGORIES).optional(), use_photo: z.boolean().optional(), color: hexOpt, tags, featured: z.boolean().optional() }),
  add_menu_item: z.object({ name: z.string().min(1).max(60), description: z.string().max(200).optional(), price_eur: z.number().min(0).max(500).optional(), group: z.enum(["delizie", "vaschette", "extra"]).optional(), use_photo: z.boolean().optional() }),
  update_menu_item: z.object({ item: z.string().min(1), new_name: z.string().max(60).optional(), description: z.string().max(200).optional(), visible: z.boolean().optional(), use_photo: z.boolean().optional() }),
  add_gallery_photo: z.object({ caption: z.string().max(200).optional() }),
  moderate_comment: z.object({ comment: z.string().min(1), approve: z.boolean() }),
  set_text: z.object({ key: z.enum(TEXT_KEYS), text: z.string().min(1).max(600) }),
  remove_flavor: z.object({ flavor: z.string().min(1) }),
  replace_today_flavors: z.object({ flavors: z.array(z.string().min(1)).min(1).max(40) }),
  update_price: z.object({ item: z.string().min(1), price_eur: z.number().min(0).max(500) }),
  set_hours: z
    .object({ weekday: z.number().int().min(1).max(7).optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), open: hhmm.optional(), close: hhmm.optional(), closed: z.boolean().optional(), note: z.string().max(80).optional() })
    .refine((v) => v.weekday || v.date, "weekday or date required"),
  set_banner: z.object({ text: z.string().min(1).max(200), until: z.string().optional() }),
  clear_banner: z.object({}),
  toggle_section: z.object({ section: z.enum(SECTION_KEYS), visible: z.boolean() }),
  set_motion: z.object({
    intensity: z.number().min(0).max(1.5).optional(),
    preloader: z.enum(["full", "short", "off"]).optional(),
    galleryInterval: z.number().min(2).max(20).optional(),
    meltSpeed: z.number().min(0.3).max(3).optional(),
    cursor: z.boolean().optional(),
    sprinkles: z.boolean().optional(),
    smoothScroll: z.boolean().optional(),
  }),
  undo_last: z.object({}),
  ask_choice: z.object({ question: z.string().min(1), options: z.array(z.string().min(1)).min(2).max(4) }),
} as const;

export type ToolName = keyof typeof TOOL_INPUT;

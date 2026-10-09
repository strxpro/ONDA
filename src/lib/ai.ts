import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { compatChat, provider } from "./llm";
import { FLAVOR_CATEGORIES, LOCALES, SCOOP_TEXTURES, type I18nText } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
export const hasAI = provider() !== null;

/** JSON answer from a free / OpenAI-compatible model, validated with Zod. */
async function compatJson<T>(schema: z.ZodType<T>, system: string, user: string): Promise<T> {
  const r = await compatChat({
    json: true,
    maxTokens: 3000,
    messages: [
      {
        role: "system",
        content: `${system}
Answer with one JSON object only.`,
      },
      { role: "user", content: user },
    ],
  });
  return schema.parse(JSON.parse(r.message.content ?? "{}"));
}

let client: Anthropic | null = null;
export const anthropic = () => (client ??= new Anthropic());

const Translations = z.object(Object.fromEntries(LOCALES.map((l) => [l, z.string()])) as Record<(typeof LOCALES)[number], z.ZodString>);

/** Translate short shop copy into all six languages (any input language). Falls back to copying the text. */
export async function translate(fields: Record<string, string>): Promise<Record<string, I18nText>> {
  const entries = Object.entries(fields).filter(([, v]) => v?.trim());
  if (!entries.length) return {};
  if (!hasAI) return Object.fromEntries(entries.map(([k, v]) => [k, Object.fromEntries(LOCALES.map((l) => [l, v])) as I18nText]));

  const schema = z.object(Object.fromEntries(entries.map(([k]) => [k, Translations])));
  if (provider() !== "anthropic") {
    const shape = `{ ${entries.map(([k]) => `"${k}": { "it": "…", "pl": "…", "en": "…", "es": "…", "de": "…", "fr": "…" }`).join(", ")} }`;
    return (await compatJson(
      schema,
      `${TRANSLATE_SYSTEM}
Shape: ${shape}`,
      JSON.stringify(Object.fromEntries(entries)),
    )) as Record<string, I18nText>;
  }
  const res = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(schema) },
    system: TRANSLATE_SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(Object.fromEntries(entries)) }],
  });
  if (!res.parsed_output) throw new Error("Translation failed");
  return res.parsed_output as Record<string, I18nText>;
}

const TRANSLATE_SYSTEM =
  "You translate short texts for the website of Gelateria Onda, an artisan gelato shop in Santa Teresa Gallura, Sardinia. " +
  "Return natural, warm, concise copy in Italian (it), Polish (pl), English (en), Spanish (es), German (de) and French (fr). " +
  "Keep proper names and flavor names that are brand names (e.g. 'Yellow Submarine') unchanged. Gelato flavor names use the usual local name (Pistacchio → Pistacja / Pistachio / Pistacho / Pistazie / Pistache).";

const FlavorLook = z.object({
  color_primary: z.string().describe("#RRGGBB, the real color of this gelato, pastel-leaning"),
  color_secondary: z.string().describe("#RRGGBB for chunks/swirl/accent"),
  scoop_texture: z.enum(SCOOP_TEXTURES),
  category: z.enum(FLAVOR_CATEGORIES),
});

const PALETTE = ["#FF8FB8", "#FFE066", "#6FE0C4", "#9B8CFF", "#FFAA5C", "#A8DB7A"];

/** Pick realistic colors, texture and category for a new flavor. */
export async function flavorLook(name: string, hint?: string): Promise<z.infer<typeof FlavorLook>> {
  const fallback = {
    color_primary: PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length],
    color_secondary: "#4B2A20",
    scoop_texture: "smooth" as const,
    category: "crema" as const,
  };
  if (!hasAI) return fallback;
  try {
    if (provider() !== "anthropic") {
      const out = await compatJson(
        FlavorLook,
        "Choose the look of a gelato flavor. Keys: color_primary (#RRGGBB, its real color, pastel-leaning), color_secondary (#RRGGBB accent), scoop_texture (one of " +
          SCOOP_TEXTURES.join(", ") +
          "), category (one of " +
          FLAVOR_CATEGORIES.join(", ") +
          ").",
        `Gelato flavor: "${name}".${hint ? ` Notes: ${hint}.` : ""}`,
      );
      return /^#[0-9a-f]{6}$/i.test(out.color_primary) && /^#[0-9a-f]{6}$/i.test(out.color_secondary) ? out : fallback;
    }
    const res = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 1000,
      output_config: { effort: "low", format: zodOutputFormat(FlavorLook) },
      messages: [
        {
          role: "user",
          content: `Gelato flavor: "${name}".${hint ? ` Notes: ${hint}.` : ""} Choose its look.`,
        },
      ],
    });
    const out = res.parsed_output;
    if (!out || !/^#[0-9a-f]{6}$/i.test(out.color_primary) || !/^#[0-9a-f]{6}$/i.test(out.color_secondary)) return fallback;
    return out;
  } catch {
    return fallback;
  }
}

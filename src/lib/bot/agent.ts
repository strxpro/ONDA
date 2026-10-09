import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { MODEL, anthropic } from "../ai";
import { compatChat, provider, type CompatMessage, type CompatTool } from "../llm";
import { nowIn } from "../hours";
import { undoLast } from "../mutations";
import * as ops from "../ops";
import { store, type Actor } from "../store";
import type { Flavor, OpeningHours, PriceItem, Reservation, SpecialDay } from "../types";
import { RESTORE_LABEL, RESTORE_PARTS, restoreDefaults, type RestorePart } from "../restore";
import { BOT_SKILL } from "./skill";
import { READ_TOOLS, TOOL_DEFS, TOOL_INPUT, type ToolName } from "./tools";

/** A change waiting for the owner's ✅. Args are already resolved to row ids. */
export type Staged = {
  tool: ToolName;
  args: Record<string, unknown>;
  label: string;
};
export type Choice = { question: string; options: string[]; multi?: boolean };
export type AgentResult = {
  text: string;
  lang: Lang;
  staged: Staged[];
  choice?: Choice;
  /** he wants to add photos he has not sent yet: the next ones are for this */
  awaitPhotos?: { instruction: string; many: boolean };
};
/** A photo the owner sent with the message, already uploaded. */
export type Photo = { url: string; width: number; height: number };
export type Lang = "it" | "pl" | "en" | "es" | "de" | "fr";

/** Cheap language guess for button labels (the reply text itself is written by Claude). */
export function detectLang(text: string): Lang {
  const t = ` ${text.toLowerCase()} `;
  if (/[ąćęłńóśźż]/.test(t) || /\b(się|jest|ile|zmień|dodaj|dziś|cenę|osób|był|usuń|smak)\b/.test(t)) return "pl";
  if (/[äöüß]/.test(t) || /\b(heute|preis|sorte|ändere|wie viele|ist|und)\b/.test(t)) return "de";
  if (/\b(aujourd|prix|parfum|combien|est fini|ajoute|change le)\b/.test(t) || /[ç]/.test(t)) return "fr";
  if (/[ñ¿¡]/.test(t) || /\b(hoy|precio|sabor|cuántas|añade|cambia el|se acabó)\b/.test(t)) return "es";
  if (/\b(the|price|today|how many|add|change|sold out|flavor|flavour)\b/.test(t)) return "en";
  return "it";
}

const fmtFlavor = (f: Flavor) =>
  `- ${f.name.it}${f.name.en && f.name.en !== f.name.it ? ` (${f.name.en}/${f.name.pl ?? ""})` : ""}: ${f.deleted_at ? "removed" : f.is_available_today ? "available" : "SOLD OUT"}`;

async function systemPrompt() {
  const [flavors, prices, settings] = await Promise.all([ops.allFlavors(true), ops.allPrices(), store().get("site_settings", 1)]);
  const tz = (settings?.timezone as string) ?? "Europe/Rome";
  const n = nowIn(tz);
  const weekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][n.weekday - 1];
  const time = `${String(Math.floor(n.minutes / 60)).padStart(2, "0")}:${String(n.minutes % 60).padStart(2, "0")}`;
  return `You are the website assistant of Gelateria Onda (artisan gelato shop in Santa Teresa Gallura, Sardinia). The owner, Mauro, talks to you on Telegram, often by voice (transcribed, so expect small transcription errors) and in any language (Italian, Polish, English, Spanish, German, French).

Your job: understand what he wants and call the right tools. Rules:
- Reads (stats, lists, hours) — call the tool and answer with the exact numbers, briefly.
- Changes — call the write tools. They are NOT applied yet: the owner gets ✅/❌ buttons. After staging, reply with ONE short sentence summarizing exactly what will change and asking to confirm. Never say it's done.
- Several changes in one message are fine (call several tools).
- If something is genuinely ambiguous, call ask_choice with 2-4 options instead of guessing.
- Always reply in the owner's language, warm and very short. No markdown headings.
- "people/persone/osób/visitors" = unique visitors; "visits/visite/wejść" = page views.
- Prices are in euros; "3,50" means 3.50.
- If the message says [PHOTO ATTACHED], decide what the photo is for from the caption/context: a flavor (add_flavor/update_flavor with use_photo=true), a treat (add_menu_item/update_menu_item with use_photo=true) or the gallery (add_gallery_photo). If there is no caption, ask with ask_choice.
- Everything on the website can be changed: flavors (availability, name, description, ingredients, category, color, photo), prices, "Altre delizie" treats, opening hours, banner, gallery photos, texts, sections, animations, visitors' comments.

Now: ${weekday} ${n.date} ${time} (Sardinia time). ISO weekday numbers: 1=Monday … 7=Sunday.

Flavors (Italian name first):
${flavors.map(fmtFlavor).join("\n")}

Price board:
${prices.map((p) => `- ${p.label.it}${p.label.en ? ` (${p.label.en})` : ""}: € ${p.price_eur.toFixed(2)}${p.is_active ? "" : " [hidden]"}`).join("\n")}

Website sections: announcement, hero, flavors (with the cone/cup price strip), lab (gallery), configurator, signature, prices ("Altre delizie": other treats + take-away tubs + pre-orders), reviews, visit, footer.
${BOT_SKILL}`;
}

/* ─── reads ──────────────────────────────────────────────────────────────── */

export async function runRead(tool: (typeof READ_TOOLS)[number], args: Record<string, unknown>) {
  switch (tool) {
    case "get_stats": {
      const s = await ops.getStats(args.period as "today");
      return {
        visits: s.visits,
        people: s.visitors,
        top_pages: s.top_pages.slice(0, 3),
        devices: s.devices,
        countries: s.countries.slice(0, 5),
      };
    }
    case "list_flavors": {
      const fl = await ops.allFlavors();
      return fl
        .filter((f) => !args.onlyAvailable || f.is_available_today)
        .map((f) => ({
          name: f.name.it,
          available: f.is_available_today,
          tags: f.tags,
        }));
    }
    case "list_prices":
      return (await ops.allPrices()).map((p) => ({
        item: p.label.it,
        price_eur: p.price_eur,
        visible: p.is_active,
      }));
    case "list_reservations": {
      const rows = (await store().list("reservations")) as Reservation[];
      const from = Date.now() - 6 * 3_600_000;
      return rows
        .filter((r) => (r.status === "new" || r.status === "confirmed") && Date.parse(r.pickup_at) > from)
        .sort((a, b) => a.pickup_at.localeCompare(b.pickup_at))
        .slice(0, 20)
        .map((r) => ({ pickup: new Date(r.pickup_at).toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), what: r.items, name: r.name, phone: r.phone, notes: r.notes, status: r.status }));
    }
    case "list_comments":
      return (await ops.pendingComments()).map((c) => ({
        author: c.name,
        text: c.message,
        stars: c.rating,
        private_feedback: c.rating != null && c.rating <= 3,
        favorite: c.flavor_slug,
        when: c.created_at,
      }));
    case "get_hours": {
      const [h, sd] = await Promise.all([store().list("opening_hours"), store().list("special_days")]);
      return {
        weekly: (h as OpeningHours[]).sort((a, b) => a.weekday - b.weekday),
        special_days: sd as SpecialDay[],
      };
    }
  }
}

/* ─── staging (resolve names → ids, or ask) ───────────────────────────────── */

type Resolved = { staged: Staged } | { choice: Choice };

async function resolveFlavor(name: string, question: string): Promise<{ flavor: Flavor } | { choice: Choice }> {
  const m = await ops.findFlavor(name);
  if (m && (m.score >= 0.9 || m.alternatives.length === 0)) return { flavor: m.item };
  const options = m ? [m.item, ...m.alternatives] : (await ops.allFlavors()).slice(0, 4);
  return {
    choice: { question, options: options.slice(0, 4).map((f) => f.name.it) },
  };
}

export async function stage(tool: ToolName, a: Record<string, unknown>, lang: Lang, photo?: Photo): Promise<Resolved> {
  if (a.use_photo || tool === "add_gallery_photo") {
    if (!photo)
      return {
        choice: {
          question: {
            it: "Mandami prima la foto 📷",
            pl: "Najpierw wyślij zdjęcie 📷",
            en: "Send me the photo first 📷",
            es: "Mándame primero la foto 📷",
            de: "Schick mir zuerst das Foto 📷",
            fr: "Envoie-moi d'abord la photo 📷",
          }[lang],
          options: ["OK"],
        },
      };
    a = { ...a, photo };
  }
  const which = {
    it: "Quale gusto?",
    pl: "Który smak?",
    en: "Which flavor?",
    es: "¿Qué sabor?",
    de: "Welche Sorte?",
    fr: "Quel parfum ?",
  }[lang];
  switch (tool) {
    case "set_flavor_availability":
    case "remove_flavor":
    case "set_signature_flavor":
    case "update_flavor": {
      const r = await resolveFlavor(String(a.flavor), which);
      if ("choice" in r) return r;
      const f = r.flavor;
      if (a.category) a = { ...a, category: a.category };
      const label =
        tool === "set_flavor_availability"
          ? `${f.name.it}: ${a.available ? "di nuovo disponibile" : "FINITO"}`
          : tool === "remove_flavor"
            ? `togliere ${f.name.it} dal sito`
            : tool === "set_signature_flavor"
              ? `${f.name.it} diventa il gusto firma (la grande sezione del sito)`
            : `modificare ${f.name.it} (${Object.keys(a)
                .filter((k) => k !== "flavor")
                .join(", ")})`;
      return {
        staged: {
          tool,
          args: { ...a, id: f.id, flavorName: f.name.it },
          label,
        },
      };
    }
    case "update_price": {
      const m = await ops.findPrice(String(a.item));
      if (!m || (m.score < 0.85 && m.alternatives.length)) {
        const opts = m ? [m.item, ...m.alternatives] : (await ops.allPrices()).slice(0, 4);
        return {
          choice: {
            question: {
              it: "Quale prezzo?",
              pl: "Która pozycja?",
              en: "Which item?",
              es: "¿Qué producto?",
              de: "Welcher Artikel?",
              fr: "Quel article ?",
            }[lang],
            options: opts.slice(0, 4).map((p) => p.label.it),
          },
        };
      }
      const p: PriceItem = m.item;
      return {
        staged: {
          tool,
          args: { id: p.id, price_eur: a.price_eur },
          label: `${p.label.it}: € ${p.price_eur.toFixed(2)} → € ${Number(a.price_eur).toFixed(2)}`,
        },
      };
    }
    case "add_menu_item":
      return {
        staged: {
          tool,
          args: a,
          label: `nuova voce «${a.name}»${a.price_eur ? ` € ${Number(a.price_eur).toFixed(2)}` : ""}${a.photo ? " + foto" : ""}`,
        },
      };
    case "update_menu_item": {
      const m = await ops.findPrice(String(a.item));
      if (!m)
        return {
          choice: {
            question: {
              it: "Quale voce?",
              pl: "Która pozycja?",
              en: "Which item?",
              es: "¿Qué producto?",
              de: "Welcher Artikel?",
              fr: "Quel article ?",
            }[lang],
            options: (await ops.allPrices())
              .filter((p) => p.price_group === "delizie")
              .slice(0, 4)
              .map((p) => p.label.it),
          },
        };
      return {
        staged: {
          tool,
          args: { ...a, id: m.item.id },
          label: `modificare ${m.item.label.it} (${Object.keys(a)
            .filter((k) => !["item", "use_photo"].includes(k))
            .join(", ")})`,
        },
      };
    }
    case "add_gallery_photo":
      return {
        staged: {
          tool,
          args: a,
          label: `nuova foto in galleria${a.caption ? ` «${a.caption}»` : ""}`,
        },
      };
    case "moderate_comment": {
      const pending = await ops.pendingComments();
      const q = String(a.comment).toLowerCase();
      const hits = q === "all" || q === "tutti" || q === "wszystkie" ? pending : pending.filter((c) => c.message.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
      if (!hits.length)
        return {
          choice: {
            question: {
              it: "Non trovo quel commento. Quale?",
              pl: "Nie widzę tego komentarza. Który?",
              en: "I can't find it. Which one?",
              es: "No lo encuentro. ¿Cuál?",
              de: "Nicht gefunden. Welcher?",
              fr: "Introuvable. Lequel ?",
            }[lang],
            options: pending
              .slice(0, 4)
              .map((c) => `${c.name}: ${c.message.slice(0, 30)}`)
              .concat(pending.length ? [] : ["OK"]),
          },
        };
      return {
        staged: {
          tool,
          args: { ids: hits.map((c) => c.id), approve: a.approve },
          label: `${a.approve ? "pubblicare" : "scartare"} ${hits.length} commento/i: ${hits.map((c) => `«${c.message.slice(0, 40)}»`).join(", ")}`,
        },
      };
    }
    case "set_text":
      return {
        staged: { tool, args: a, label: `testo ${a.key}: «${a.text}»` },
      };
    case "add_flavor":
      return {
        staged: {
          tool,
          args: a,
          label: `nuovo gusto «${a.name}»${a.color ? ` ${a.color}` : ""}${(a.tags as string[] | undefined)?.length ? ` [${(a.tags as string[]).join(", ")}]` : ""}`,
        },
      };
    case "replace_today_flavors":
      return {
        staged: {
          tool,
          args: a,
          label: `gusti di oggi: ${(a.flavors as string[]).join(", ")} (tutti gli altri finiti)`,
        },
      };
    case "set_hours":
      return {
        staged: {
          tool,
          args: a,
          label: `orari ${a.date ?? `giorno ${a.weekday}`}: ${a.closed ? "chiuso" : `${a.open ?? "…"}–${a.close ?? "…"}`}`,
        },
      };
    case "set_banner":
      return {
        staged: {
          tool,
          args: a,
          label: `banner «${a.text}»${a.until ? ` fino a ${a.until}` : ""}`,
        },
      };
    case "clear_banner":
      return { staged: { tool, args: a, label: "togliere il banner" } };
    case "toggle_section":
      return {
        staged: {
          tool,
          args: a,
          label: `sezione ${a.section}: ${a.visible ? "visibile" : "nascosta"}`,
        },
      };
    case "set_motion":
      return {
        staged: { tool, args: a, label: `animazioni: ${JSON.stringify(a)}` },
      };
    case "undo_last": {
      const last = (await store().listAudit(30)).find((e) => !e.undone_at && e.action !== "undo");
      return {
        staged: {
          tool,
          args: a,
          label: last ? `annullare l'ultima modifica (${last.action}, ${new Date(last.created_at).toLocaleTimeString("it", { timeStyle: "short" })})` : "niente da annullare",
        },
      };
    }
    case "restore_defaults": {
      const parts = ((a.parts as RestorePart[] | undefined) ?? []).length ? (a.parts as RestorePart[]) : [...RESTORE_PARTS];
      return { staged: { tool, args: { parts }, label: `⚠️ ripristinare all'originale: ${parts.map((p) => RESTORE_LABEL[p]).join(", ")} (si può annullare)` } };
    }
    default:
      throw new Error(`Not a write tool: ${tool}`);
  }
}

/** Apply a confirmed change. */
export async function execute(s: Staged, actor: Actor) {
  const a = s.args;
  switch (s.tool) {
    case "set_flavor_availability":
      return ops.setFlavorAvailability(a.id as string, a.available as boolean, actor);
    case "remove_flavor":
      return ops.removeFlavor(a.id as string, actor);
    case "set_signature_flavor":
      return ops.setSignatureFlavor(a.id as string, actor);
    case "restore_defaults":
      return restoreDefaults(a.parts as RestorePart[], actor);
    case "update_flavor":
      return ops.updateFlavor(
        a.id as string,
        {
          ...(a.new_name ? { name_text: a.new_name as string } : {}),
          ...(a.description ? { description_text: a.description as string } : {}),
          ...(a.color ? { color_primary: a.color as string } : {}),
          ...(a.tags ? { tags: a.tags as Flavor["tags"] } : {}),
          ...(a.featured != null ? { is_featured: a.featured as boolean } : {}),
          ...(a.ingredients ? { ingredients_text: a.ingredients as string } : {}),
          ...(a.category ? { category: a.category as Flavor["category"] } : {}),
          ...(a.photo ? { image_url: (a.photo as Photo).url } : {}),
        },
        actor,
      );
    case "add_flavor":
      return ops.addFlavor(
        {
          name: a.name as string,
          description: a.description as string | undefined,
          ingredients: a.ingredients as string | undefined,
          category: a.category as Flavor["category"] | undefined,
          color: a.color as string | undefined,
          tags: a.tags as Flavor["tags"] | undefined,
          featured: a.featured as boolean | undefined,
          photo: (a.photo as Photo | undefined)?.url,
        },
        actor,
      );
    case "add_menu_item":
      return ops.addMenuItem(
        {
          name: a.name as string,
          description: a.description as string | undefined,
          ingredients: a.ingredients as string | undefined,
          price: a.price_eur as number | undefined,
          group: a.group as PriceItem["price_group"] | undefined,
          photo: (a.photo as Photo | undefined)?.url,
        },
        actor,
      );
    case "update_menu_item":
      return ops.updateMenuItem(
        a.id as string,
        {
          name: a.new_name as string | undefined,
          description: a.description as string | undefined,
          ingredients: a.ingredients as string | undefined,
          visible: a.visible as boolean | undefined,
          photo: (a.photo as Photo | undefined)?.url,
        },
        actor,
      );
    case "add_gallery_photo": {
      const p = a.photo as Photo;
      return ops.addGalleryPhoto(
        {
          url: p.url,
          width: p.width,
          height: p.height,
          caption: a.caption as string | undefined,
        },
        actor,
      );
    }
    case "moderate_comment":
      for (const id of a.ids as string[]) await ops.moderateComment(id, a.approve as boolean, actor);
      return;
    case "set_text":
      return ops.setText(a.key as string, a.text as string, actor);
    case "replace_today_flavors":
      return ops.replaceTodayFlavors(a.flavors as string[], actor);
    case "update_price":
      return ops.updatePrice(a.id as string, a.price_eur as number, actor);
    case "set_hours":
      return ops.setHours(a as Parameters<typeof ops.setHours>[0], actor);
    case "set_banner":
      return ops.setBanner({ text: a.text as string, until: a.until as string | undefined }, actor);
    case "clear_banner":
      return ops.clearBanner(actor);
    case "toggle_section":
      return ops.toggleSection(a.section as Parameters<typeof ops.toggleSection>[0], a.visible as boolean, actor);
    case "set_motion":
      return ops.setMotion(a, actor);
    case "undo_last":
      return undoLast(actor);
  }
}

/* ─── the loop ───────────────────────────────────────────────────────────── */

const textOf = (content: Anthropic.Beta.BetaContentBlock[]) =>
  content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

/** Understand one owner message. Reads are answered; writes are staged for confirmation. */
export async function runAgent(userText: string, photo?: Photo): Promise<AgentResult> {
  const lang = detectLang(userText);
  const system = await systemPrompt();
  const first = photo ? `[PHOTO ATTACHED]\n${userText || "(no caption)"}` : userText;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: first }];
  const staged: Staged[] = [];
  const fallbackText = () => (staged.length ? staged.map((s) => s.label).join("\n") : "👍");

  /** one tool call → its result text, or a final answer (a question / a choice) that ends the turn */
  const handle = async (name: ToolName, input: unknown): Promise<{ result: string; error?: boolean } | { done: AgentResult }> => {
    const parsed = TOOL_INPUT[name]?.safeParse(input);
    if (!parsed?.success) return { result: `Invalid input: ${parsed?.error.message ?? "unknown tool"}`, error: true };
    const args = parsed.data as Record<string, unknown>;
    if (name === "ask_choice") return { done: { text: String(args.question), lang, staged: [], choice: args as Choice } };
    if (name === "ask_for_photos") return { done: { text: String(args.reply), lang, staged: [], awaitPhotos: { instruction: String(args.instruction), many: Boolean(args.many) } } };
    if ((READ_TOOLS as readonly string[]).includes(name)) return { result: JSON.stringify(await runRead(name as (typeof READ_TOOLS)[number], args)) };
    const r = await stage(name, args, lang, photo);
    if ("choice" in r) return { done: { text: r.choice.question, lang, staged: [], choice: r.choice } };
    staged.push(r.staged);
    return { result: `STAGED, not applied yet: ${r.staged.label}. The owner will confirm with a button.` };
  };

  // free / OpenAI-compatible models (Groq, Gemini, Grok)
  if (provider() !== "anthropic") {
    const tools: CompatTool[] = TOOL_DEFS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
    const chat: CompatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: first },
    ];
    for (let turn = 0; turn < 6; turn++) {
      const { message } = await compatChat({ messages: chat, tools });
      const calls = message.tool_calls ?? [];
      if (!calls.length) return { text: message.content?.trim() || fallbackText(), lang, staged };
      chat.push({ role: "assistant", content: message.content ?? null, tool_calls: calls });
      let readSomething = false;
      for (const c of calls) {
        if ((READ_TOOLS as readonly string[]).includes(c.function.name)) readSomething = true;
        let input: unknown;
        try {
          input = JSON.parse(c.function.arguments || "{}");
        } catch {
          chat.push({ role: "tool", tool_call_id: c.id, content: "Invalid JSON arguments" });
          continue;
        }
        const h = await handle(c.function.name as ToolName, input);
        if ("done" in h) return h.done;
        chat.push({ role: "tool", tool_call_id: c.id, content: h.result });
      }
      // only changes were staged: the ✅/❌ summary is the answer — saves a call on the free tier
      if (!readSomething && staged.length) return { text: fallbackText(), lang, staged };
      // only questions: phrase the answer with a tiny prompt (no tools, no menu) — a fraction of the tokens
      if (readSomething && !staged.length) {
        const data = chat.filter((m) => m.role === "tool").map((m) => m.content).join("\n");
        const { message: m } = await compatChat({
          maxTokens: 400,
          messages: [
            { role: "system", content: "You are the friendly assistant of Gelateria Onda. Answer the owner's question in HIS language (the language of the question), in one or two short sentences, using ONLY the data given. Exact numbers. No markdown." },
            { role: "user", content: `Question: ${first}\n\nData:\n${data.slice(0, 6000)}` },
          ],
        });
        return { text: m.content?.trim() || data.slice(0, 500), lang, staged };
      }
    }
    return { text: fallbackText(), lang, staged };
  }

  for (let turn = 0; turn < 6; turn++) {
    const res = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system,
      tools: TOOL_DEFS,
      messages,
    });
    if (res.stop_reason === "refusal")
      return {
        text: "Mi dispiace, non posso aiutarti con questa richiesta.",
        lang,
        staged: [],
      };

    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!uses.length || res.stop_reason === "end_turn") {
      return {
        text: textOf(res.content) || fallbackText(),
        lang,
        staged,
      };
    }
    messages.push({ role: "assistant", content: res.content });

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const use of uses) {
      const h = await handle(use.name as ToolName, use.input);
      if ("done" in h) return h.done;
      results.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: h.result,
        ...(h.error ? { is_error: true } : {}),
      });
    }
    messages.push({ role: "user", content: results });
  }
  return { text: staged.map((s) => s.label).join("\n"), lang, staged };
}

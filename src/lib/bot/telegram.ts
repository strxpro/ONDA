import "server-only";

import { Bot, InlineKeyboard, type Context } from "grammy";
import { store, type Actor } from "../store";
import { patchRow } from "../mutations";
import { saveImage } from "../upload";
import { detectLang, execute, runAgent, type AgentResult, type Lang, type Photo, type Staged } from "./agent";
import { transcribe } from "./transcribe";

type Strings = { heard: string; confirm: string; cancel: string; done: string; cancelled: string; expired: string; error: string; working: string; ok: string; own: string; typeIt: string };
const L: Record<Lang, Strings> = {
  it: { heard: "🎙️ Ho capito:", confirm: "✅ Conferma", cancel: "❌ Annulla", done: "✅ Fatto! Il sito è aggiornato.", cancelled: "❌ Annullato, non ho cambiato niente.", expired: "⏱️ Richiesta scaduta, ripeti pure.", error: "😕 Qualcosa è andato storto:", working: "Un attimo…", ok: "👌 Fatto, questi", own: "✏️ Scrivo io", typeIt: "✏️ Scrivimi la risposta:" },
  pl: { heard: "🎙️ Zrozumiałem:", confirm: "✅ Potwierdź", cancel: "❌ Anuluj", done: "✅ Gotowe! Strona jest zaktualizowana.", cancelled: "❌ Anulowano, nic nie zmieniłem.", expired: "⏱️ Prośba wygasła, powtórz proszę.", error: "😕 Coś poszło nie tak:", working: "Chwileczkę…", ok: "👌 Gotowe, te", own: "✏️ Napiszę sam", typeIt: "✏️ Napisz mi odpowiedź:" },
  en: { heard: "🎙️ I heard:", confirm: "✅ Confirm", cancel: "❌ Cancel", done: "✅ Done! The website is updated.", cancelled: "❌ Cancelled, nothing changed.", expired: "⏱️ This request expired, please repeat.", error: "😕 Something went wrong:", working: "One moment…", ok: "👌 Done, these", own: "✏️ I'll type it", typeIt: "✏️ Type your answer:" },
  es: { heard: "🎙️ He entendido:", confirm: "✅ Confirmar", cancel: "❌ Cancelar", done: "✅ ¡Hecho! La web está actualizada.", cancelled: "❌ Cancelado, no he cambiado nada.", expired: "⏱️ La solicitud caducó, repítela.", error: "😕 Algo salió mal:", working: "Un momento…", ok: "👌 Listo, estos", own: "✏️ Lo escribo yo", typeIt: "✏️ Escríbeme la respuesta:" },
  de: { heard: "🎙️ Verstanden:", confirm: "✅ Bestätigen", cancel: "❌ Abbrechen", done: "✅ Erledigt! Die Website ist aktualisiert.", cancelled: "❌ Abgebrochen, nichts geändert.", expired: "⏱️ Anfrage abgelaufen, bitte wiederholen.", error: "😕 Etwas ist schiefgelaufen:", working: "Einen Moment…", ok: "👌 Fertig, diese", own: "✏️ Ich schreibe selbst", typeIt: "✏️ Schreib mir die Antwort:" },
  fr: { heard: "🎙️ J'ai compris :", confirm: "✅ Confirmer", cancel: "❌ Annuler", done: "✅ C'est fait ! Le site est à jour.", cancelled: "❌ Annulé, rien n'a changé.", expired: "⏱️ Demande expirée, répète s'il te plaît.", error: "😕 Un problème :", working: "Un instant…", ok: "👌 C'est bon, ceux-ci", own: "✏️ J'écris moi-même", typeIt: "✏️ Écris-moi la réponse :" },
};

const actorOf = (ctx: Context): Actor => ({ actor: `telegram:${ctx.from!.id}${ctx.from?.username ? ` (@${ctx.from.username})` : ""}`, source: "telegram" });
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Only Telegram users listed in admin_users may talk to the bot; everyone else is ignored silently. */
async function isAdmin(ctx: Context) {
  return Boolean(ctx.from && (await store().adminByTelegram(ctx.from.id)));
}

/** Keep the "typing…" dots on in the owner's chat until `work` is done (Telegram clears them after ~5 s). */
async function typing<T>(ctx: Context, work: () => Promise<T>, action: "typing" | "upload_photo" = "typing"): Promise<T> {
  const ping = () => ctx.replyWithChatAction(action).catch(() => {});
  void ping();
  const id = setInterval(ping, 4000);
  try {
    return await work();
  } finally {
    clearInterval(id);
  }
}

/** Buttons for a question: one per option (ticked ☑ when multi), "done" for multi, and "I'll type it". */
function choiceKeyboard(id: string, options: string[], picked: number[], multi: boolean, t: Strings) {
  const kb = new InlineKeyboard();
  options.forEach((o, i) => kb.text(multi ? `${picked.includes(i) ? "☑" : "☐"} ${o}` : o, `ch:${id}:${i}`).row());
  if (multi) kb.text(t.ok, `cd:${id}`).row();
  kb.text(t.own, `cw:${id}`);
  return kb;
}

async function handle(ctx: Context, text: string, photo?: Photo) {
  let result: AgentResult;
  try {
    result = await typing(ctx, () => runAgent(text, photo));
  } catch (e) {
    await ctx.reply(`${L.it.error} ${errText(e)}`);
    return;
  }
  const t = L[result.lang];

  if (result.awaitPhotos) {
    // the next photo(s) he sends are for this
    await store().createPending({
      telegram_user_id: ctx.from!.id,
      chat_id: ctx.chat!.id,
      tool: "await_photo",
      args: { ...result.awaitPhotos, lang: result.lang },
      summary: result.text,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    await ctx.reply(`📷 ${result.text}`);
    return;
  }

  if (result.choice) {
    const multi = Boolean(result.choice.multi);
    const p = await store().createPending({
      telegram_user_id: ctx.from!.id,
      chat_id: ctx.chat!.id,
      tool: "choice",
      args: { original: text, options: result.choice.options, multi, picked: [], lang: result.lang, photo: photo ?? null },
      summary: result.choice.question,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    await ctx.reply(result.choice.question, { reply_markup: choiceKeyboard(p.id, result.choice.options, [], multi, t) });
    return;
  }

  if (!result.staged.length) {
    await ctx.reply(result.text);
    return;
  }

  const p = await store().createPending({
    telegram_user_id: ctx.from!.id,
    chat_id: ctx.chat!.id,
    tool: "batch",
    args: { staged: result.staged, lang: result.lang },
    summary: result.text,
    expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  const list = result.staged.map((s) => `• ${s.label}`).join("\n");
  const onlyLabels = result.text.trim() === result.staged.map((s) => s.label).join("\n");
  await ctx.reply(onlyLabels ? list : `${result.text}\n\n${list}`, {
    reply_markup: new InlineKeyboard().text(t.confirm, `ok:${p.id}`).text(t.cancel, `no:${p.id}`),
  });
}

/** A typed message may be the answer to a question the owner chose to answer in his own words. */
async function answerTypedChoice(ctx: Context, text: string) {
  const p = await store().latestPending(ctx.from!.id, "choice_text");
  if (!p) return false;
  await store().setPendingStatus(p.id, "confirmed");
  await handle(ctx, `${p.args.original}\n(${p.summary} → ${text})`, (p.args.photo as Photo | null) ?? undefined);
  return true;
}

let bot: Bot | null = null;

export function getBot() {
  if (bot) return bot;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN mancante");
  bot = new Bot(token);

  bot.on("message:text", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    if (ctx.message.text === "/start") {
      await ctx.reply("Ciao! Scrivimi o mandami un vocale, in qualsiasi lingua: «Il pistacchio è finito», «Quante persone oggi?», «Cono medio 3,80», «Aggiungi il gusto mirto»…");
      return;
    }
    if (await answerTypedChoice(ctx, ctx.message.text)) return;
    await handle(ctx, ctx.message.text);
  });

  // a photo (with or without a caption): uploaded first, then the assistant decides where it goes
  bot.on("message:photo", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    try {
      const saved = await typing(
        ctx,
        async () => {
          const file = await ctx.getFile(); // grammY picks the largest size
          const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
          return saveImage(await res.arrayBuffer());
        },
        "upload_photo",
      );
      // a photo without a caption, after he said he would send one: it is for that
      const waiting = !ctx.message.caption ? await store().latestPending(ctx.from!.id, "await_photo") : null;
      if (waiting && !waiting.args.many) await store().setPendingStatus(waiting.id, "confirmed");
      await handle(ctx, waiting ? `${String(waiting.args.instruction)} (the photo he announced)` : (ctx.message.caption ?? ""), saved);
    } catch (e) {
      await ctx.reply(`${L.it.error} ${errText(e)}`);
    }
  });

  bot.on(["message:voice", "message:audio"], async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    try {
      const text = await typing(ctx, async () => {
        const file = await ctx.getFile();
        const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
        return transcribe(await res.arrayBuffer());
      });
      if (!text) {
        await ctx.reply("🎙️ Non ho sentito niente, riprova.");
        return;
      }
      await ctx.reply(`${L[detectLang(text)].heard} «${text}»`);
      if (await answerTypedChoice(ctx, text)) return;
      await handle(ctx, text);
    } catch (e) {
      await ctx.reply(`${L.it.error} ${errText(e)}`);
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    if (!(await isAdmin(ctx))) return void ctx.answerCallbackQuery();
    const [kind, id, idx] = ctx.callbackQuery.data.split(":");
    // a visitor's comment / reservation: straight from the notification
    if (kind === "cm") {
      await ctx.answerCallbackQuery();
      const status = idx === "ok" ? "approved" : "rejected";
      try {
        await patchRow("comments", id, { status }, { ...actorOf(ctx), action: `comment_${status}` });
        await ctx.editMessageText(`${ctx.callbackQuery.message && "text" in ctx.callbackQuery.message ? ctx.callbackQuery.message.text : ""}\n\n${status === "approved" ? "✅ Pubblicato" : "🗑️ Scartato"}`);
      } catch (e) {
        await ctx.reply(`${L.it.error} ${errText(e)}`);
      }
      return;
    }
    if (kind === "rs") {
      await ctx.answerCallbackQuery();
      const status = idx === "ok" ? "confirmed" : "declined";
      try {
        await patchRow("reservations", id, { status }, { ...actorOf(ctx), action: `reservation_${status}` });
        await ctx.editMessageText(`${ctx.callbackQuery.message && "text" in ctx.callbackQuery.message ? ctx.callbackQuery.message.text : ""}\n\n${status === "confirmed" ? "✅ Confermata" : "❌ Rifiutata"}`);
      } catch (e) {
        await ctx.reply(`${L.it.error} ${errText(e)}`);
      }
      return;
    }

    const p = await store().getPending(id);
    const lang = ((p?.args.lang as Lang) ?? "it") as Lang;
    const t = L[lang];
    await ctx.answerCallbackQuery();
    if (!p || p.telegram_user_id !== ctx.from.id || p.status !== "pending") return void ctx.editMessageReplyMarkup().catch(() => {});
    if (Date.parse(p.expires_at) < Date.now()) {
      await store().setPendingStatus(id, "expired");
      return void ctx.editMessageText(t.expired).catch(() => {});
    }

    if (kind === "no") {
      await store().setPendingStatus(id, "cancelled");
      await ctx.editMessageText(`${p.summary}\n\n${t.cancelled}`);
      return;
    }
    const options = (p.args.options as string[]) ?? [];
    if (kind === "ch" && p.args.multi) {
      // tick / untick, keep the question open
      const picked = new Set((p.args.picked as number[]) ?? []);
      const i = Number(idx);
      if (picked.has(i)) picked.delete(i);
      else picked.add(i);
      await store().setPendingArgs(id, { ...p.args, picked: [...picked] });
      await ctx.editMessageReplyMarkup({ reply_markup: choiceKeyboard(id, options, [...picked], true, t) }).catch(() => {});
      return;
    }
    if (kind === "ch" || kind === "cd") {
      const answer = kind === "ch" ? options[Number(idx)] : ((p.args.picked as number[]) ?? []).map((i) => options[i]).join(", ");
      if (!answer) return;
      await store().setPendingStatus(id, "confirmed");
      await ctx.editMessageText(`${p.summary} → ${answer}`);
      await handle(ctx, `${p.args.original}\n(${p.summary} → ${answer})`, (p.args.photo as Photo | null) ?? undefined);
      return;
    }
    if (kind === "cw") {
      // the owner answers in his own words: the next text or voice message is the answer
      await store().setPendingStatus(id, "confirmed");
      await store().createPending({ ...p, tool: "choice_text", expires_at: new Date(Date.now() + 15 * 60_000).toISOString() });
      await ctx.editMessageText(`${p.summary}\n\n${t.typeIt}`);
      return;
    }
    if (kind === "ok") {
      await store().setPendingStatus(id, "confirmed");
      await ctx.editMessageText(`${p.summary}\n\n${t.working}`).catch(() => {});
      try {
        await typing(ctx, async () => {
          for (const s of p.args.staged as Staged[]) await execute(s, actorOf(ctx));
        });
        await ctx.editMessageText(`${p.summary}\n\n${t.done}`);
      } catch (e) {
        await ctx.editMessageText(`${p.summary}\n\n${t.error} ${errText(e)}`);
      }
    }
  });

  bot.catch((err) => console.error("[telegram]", err.error));
  return bot;
}

/** Send a message to every admin chat on Telegram. Silent if Telegram isn't configured. */
async function toAdmins(text: string, keyboard?: InlineKeyboard) {
  const chat = process.env.ADMIN_TELEGRAM_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chat) return;
  try {
    await getBot().api.sendMessage(Number(chat), text, keyboard ? { reply_markup: keyboard } : undefined);
  } catch (e) {
    console.error("[telegram] notify", e);
  }
}

/** Tell the owner on Telegram that a visitor left a comment, with ✅ / 🗑️ buttons. */
export async function notifyComment(c: { id: string; name: string; message: string; flavor_slug: string | null; rating?: number | null }) {
  const stars = c.rating ? ` · ${"★".repeat(c.rating)}${"☆".repeat(5 - c.rating)}` : "";
  const head = c.rating && c.rating <= 3 ? "🔒 Feedback privato" : "💬 Nuovo commento sul sito";
  await toAdmins(`${head}${stars}\n\n«${c.message}»\n— ${c.name}${c.flavor_slug ? ` (gusto preferito: ${c.flavor_slug})` : ""}`, new InlineKeyboard().text("✅ Pubblica", `cm:${c.id}:ok`).text("🗑️ Scarta", `cm:${c.id}:no`));
}

/** Tell the owner about a new pre-order (gelato by the kilo, treats…), with ✅ / ❌ buttons. */
export async function notifyReservation(text: string, id: string) {
  await toAdmins(text, new InlineKeyboard().text("✅ Conferma", `rs:${id}:ok`).text("❌ Rifiuta", `rs:${id}:no`));
}

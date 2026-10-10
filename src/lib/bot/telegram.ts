import "server-only";

import { Bot, InlineKeyboard, InputFile, type Context } from "grammy";
import type { InputMediaPhoto } from "grammy/types";
import { AllBusyError } from "../llm";
import { allPhotos, jpegOf, replacePhoto, type PhotoRef } from "../photos";
import { replyToComment, translateComment } from "../comments";
import { store, type Actor } from "../store";
import { patchRow, undoLast } from "../mutations";
import { saveImage } from "../upload";
import { detectLang, execute, runAgent, type AgentResult, type Lang, type Photo, type Staged } from "./agent";
import { transcribe } from "./transcribe";

type Strings = { heard: string; confirm: string; cancel: string; done: string; cancelled: string; expired: string; error: string; working: string; ok: string; own: string; typeIt: string };
type PhotoStrings = { isIt: string; which: string; all: string; send: string; swapped: string; undo: string; undone: string; busy: string; none: string };
const P: Record<Lang, PhotoStrings> = {
  it: { isIt: "È questa? Tocca il numero 👇", which: "Quale? Tocca il numero 👇", all: "📚 Mostra tutte", send: "📷 Ok! Mandami la nuova foto per la n.", swapped: "✅ Fatto, foto cambiata sul sito!", undo: "↩️ Annulla", undone: "↩️ Annullato, è tornata quella di prima.", busy: "😅 Le AI gratuite sono tutte occupate in questo momento. Riprova tra un minuto!", none: "Non ci sono foto." },
  pl: { isIt: "Czy to to? Kliknij numer 👇", which: "Które? Kliknij numer 👇", all: "📚 Pokaż wszystkie", send: "📷 Dobra! Wyślij mi nowe zdjęcie zamiast nr", swapped: "✅ Gotowe, zdjęcie zmienione na stronie!", undo: "↩️ Cofnij", undone: "↩️ Cofnięte, wróciło poprzednie.", busy: "😅 Wszystkie darmowe AI są teraz zajęte. Spróbuj za minutkę!", none: "Nie ma zdjęć." },
  en: { isIt: "Is it this one? Tap the number 👇", which: "Which one? Tap the number 👇", all: "📚 Show all", send: "📷 OK! Send me the new photo for no.", swapped: "✅ Done, the photo is changed on the website!", undo: "↩️ Undo", undone: "↩️ Undone, the old one is back.", busy: "😅 All the free AIs are busy right now. Try again in a minute!", none: "No photos." },
  es: { isIt: "¿Es esta? Toca el número 👇", which: "¿Cuál? Toca el número 👇", all: "📚 Ver todas", send: "📷 ¡Vale! Mándame la nueva foto para la n.", swapped: "✅ ¡Hecho, foto cambiada en la web!", undo: "↩️ Deshacer", undone: "↩️ Deshecho, vuelve la anterior.", busy: "😅 Las IA gratuitas están ocupadas. ¡Inténtalo en un minuto!", none: "No hay fotos." },
  de: { isIt: "Ist es dieses? Tippe die Nummer 👇", which: "Welches? Tippe die Nummer 👇", all: "📚 Alle zeigen", send: "📷 OK! Schick mir das neue Foto für Nr.", swapped: "✅ Erledigt, Foto auf der Website getauscht!", undo: "↩️ Rückgängig", undone: "↩️ Rückgängig, das alte ist zurück.", busy: "😅 Alle kostenlosen KIs sind gerade belegt. Versuch es in einer Minute!", none: "Keine Fotos." },
  fr: { isIt: "C'est celle-ci ? Touche le numéro 👇", which: "Laquelle ? Touche le numéro 👇", all: "📚 Tout voir", send: "📷 OK ! Envoie-moi la nouvelle photo pour la n°", swapped: "✅ C'est fait, photo changée sur le site !", undo: "↩️ Annuler", undone: "↩️ Annulé, l'ancienne est revenue.", busy: "😅 Toutes les IA gratuites sont occupées. Réessaie dans une minute !", none: "Pas de photos." },
};

/** Send photos numbered from `from` (albums of up to 10), each as a small JPEG with its number. */
async function sendNumbered(ctx: Context, refs: PhotoRef[], from = 1) {
  for (let i = 0; i < refs.length; i += 10) {
    const chunk = refs.slice(i, i + 10);
    const files = await Promise.all(chunk.map((r) => jpegOf(r.url).catch(() => null)));
    const media: InputMediaPhoto[] = [];
    chunk.forEach((r, k) => {
      const f = files[k];
      if (f) media.push({ type: "photo", media: new InputFile(f, `${from + i + k}.jpg`), caption: `${from + i + k} · ${r.label}` });
    });
    if (media.length === 1) await ctx.replyWithPhoto(media[0].media as InputFile, { caption: media[0].caption });
    else if (media.length) await ctx.replyWithMediaGroup(media);
  }
}

/** Number buttons (5 per row) + "show all". */
function pickKeyboard(id: string, n: number, t: PhotoStrings, withAll: boolean) {
  const kb = new InlineKeyboard();
  for (let i = 0; i < n; i++) {
    kb.text(String(i + 1), `pp:${id}:${i}`);
    if (i % 5 === 4) kb.row();
  }
  kb.row();
  if (withAll) kb.text(t.all, `pa:${id}`);
  kb.text("❌", `no:${id}`);
  return kb;
}

async function showPick(ctx: Context, refs: PhotoRef[], all: boolean, lang: Lang, photo: Photo | undefined) {
  const t = P[lang];
  if (!refs.length) return void (await ctx.reply(t.none));
  await typing(ctx, () => sendNumbered(ctx, refs), "upload_photo");
  const p = await store().createPending({
    telegram_user_id: ctx.from!.id,
    chat_id: ctx.chat!.id,
    tool: "photo_pick",
    args: { refs, lang, photo: photo ?? null },
    summary: refs.length === 1 ? t.isIt : t.which,
    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  });
  await ctx.reply(refs.length === 1 ? t.isIt : t.which, { reply_markup: pickKeyboard(p.id, refs.length, t, !all) });
}

/** Swap it and offer an undo. */
async function swapPhoto(ctx: Context, ref: PhotoRef, photo: Photo, lang: Lang) {
  const t = P[lang];
  await typing(ctx, () => replacePhoto(ref, photo, actorOf(ctx)), "upload_photo");
  await ctx.reply(`${t.swapped}\n(${ref.label})`, { reply_markup: new InlineKeyboard().text(t.undo, `ud:${lang}`) });
}
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
    // never a technical error: every free model was busy (or something hiccuped) — a calm "try again"
    console.error("[agent]", e instanceof AllBusyError ? e.message : e);
    await ctx.reply(P[detectLang(text)].busy);
    return;
  }
  const t = L[result.lang];

  if (result.photoPick) {
    await showPick(ctx, result.photoPick.refs, result.photoPick.all, result.lang, photo);
    return;
  }

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

/** The owner's answer to a visitor's comment (after he tapped "💬 Rispondi"). */
async function answerCommentReply(ctx: Context, text: string) {
  const p = await store().latestPending(ctx.from!.id, "comment_reply");
  if (!p) return false;
  await store().setPendingStatus(p.id, "confirmed");
  try {
    await typing(ctx, () => replyToComment(String(p.args.commentId), text, actorOf(ctx)));
    await ctx.reply("✅ Risposta pubblicata sotto il commento, in tutte le lingue 🌍");
  } catch (e) {
    console.error("[comment reply]", e);
    await ctx.reply(P.it.busy);
  }
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
    if (await answerCommentReply(ctx, ctx.message.text)) return;
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
      // …and when he already picked WHICH photo to change, it is swapped right away
      if (waiting?.args.target) {
        await store().setPendingStatus(waiting.id, "confirmed");
        await swapPhoto(ctx, waiting.args.target as PhotoRef, saved, (waiting.args.lang as Lang) ?? "it");
        return;
      }
      if (waiting && !waiting.args.many) await store().setPendingStatus(waiting.id, "confirmed");
      await handle(ctx, waiting ? `${String(waiting.args.instruction)} (the photo he announced)` : (ctx.message.caption ?? ""), saved);
    } catch (e) {
      console.error("[photo]", e);
      await ctx.reply(P.it.busy);
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
      if (await answerCommentReply(ctx, text)) return;
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
        const msg = ctx.callbackQuery.message;
        const old = msg && "text" in msg ? msg.text : msg && "caption" in msg ? msg.caption : "";
        const done = `${old ?? ""}\n\n${status === "approved" ? "✅ Pubblicato" : "🗑️ Tolto dal sito"}`;
        const kb = status === "approved" ? new InlineKeyboard().text("💬 Rispondi", `cr:${id}:0`).text("🗑️ Togli", `cm:${id}:no`) : undefined;
        if (msg && "photo" in msg) await ctx.editMessageCaption({ caption: done.slice(0, 1000), reply_markup: kb });
        else await ctx.editMessageText(done, { reply_markup: kb });
        if (status === "approved") await translateComment(id);
      } catch (e) {
        console.error("[comment]", e);
        await ctx.reply(P.it.busy);
      }
      return;
    }
    if (kind === "cr") {
      // the next text or voice message is the answer, shown under the comment in every language
      await ctx.answerCallbackQuery();
      const c = await store().get("comments", id);
      if (!c) return;
      await store().createPending({
        telegram_user_id: ctx.from.id,
        chat_id: ctx.chat!.id,
        tool: "comment_reply",
        args: { commentId: id, lang: "it" },
        summary: String(c.message).slice(0, 80),
        expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      });
      await ctx.reply(`💬 Scrivimi o dimmi a voce la risposta per ${c.name} («${String(c.message).slice(0, 60)}»). La traduco io in tutte le lingue 🌍`);
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

    if (kind === "ud") {
      // undo the photo swap
      await ctx.answerCallbackQuery();
      const lang = ((id as Lang) || "it") as Lang;
      try {
        await undoLast(actorOf(ctx));
        await ctx.editMessageReplyMarkup().catch(() => {});
        await ctx.reply(P[lang].undone);
      } catch (e) {
        console.error("[undo]", e);
        await ctx.reply(P[lang].busy);
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
    if (kind === "pa") {
      // show every photo, numbered
      await store().setPendingStatus(id, "confirmed");
      await ctx.editMessageReplyMarkup().catch(() => {});
      await showPick(ctx, await allPhotos(), true, lang, (p.args.photo as Photo | null) ?? undefined);
      return;
    }
    if (kind === "pp") {
      const ref = ((p.args.refs as PhotoRef[]) ?? [])[Number(idx)];
      if (!ref) return;
      await store().setPendingStatus(id, "confirmed");
      await ctx.editMessageText(`${p.summary} → ${Number(idx) + 1}`).catch(() => {});
      const photo = p.args.photo as Photo | null;
      if (photo) return void (await swapPhoto(ctx, ref, photo, lang));
      // the next photo he sends replaces this one
      await store().createPending({
        telegram_user_id: ctx.from.id,
        chat_id: ctx.chat!.id,
        tool: "await_photo",
        args: { target: ref, lang, instruction: "replace", many: false },
        summary: ref.label,
        expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      });
      await ctx.reply(`${P[lang].send} ${Number(idx) + 1} (${ref.label}) 👇`);
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
export async function notifyComment(c: { id: string; name: string; message: string; flavor_slug: string | null; rating?: number | null; photo_url?: string | null; parent_id?: string | null; published?: boolean }) {
  const stars = c.rating ? ` · ${"★".repeat(c.rating)}${"☆".repeat(5 - c.rating)}` : "";
  const head = c.published
    ? c.parent_id
      ? "↩️ Risposta a un commento — già sul sito"
      : "💬 Nuovo commento — già sul sito (l'AI l'ha controllato)"
    : c.rating && c.rating <= 3
      ? "🔒 Feedback privato"
      : "💬 Nuovo commento da approvare";
  const text = `${head}${stars}\n\n«${c.message}»\n— ${c.name}${c.flavor_slug ? ` (gusto preferito: ${c.flavor_slug})` : ""}`;
  const kb = c.published ? new InlineKeyboard().text("💬 Rispondi", `cr:${c.id}:0`).text("🗑️ Togli", `cm:${c.id}:no`) : new InlineKeyboard().text("✅ Pubblica", `cm:${c.id}:ok`).text("🗑️ Scarta", `cm:${c.id}:no`).row().text("💬 Rispondi", `cr:${c.id}:0`);
  const chat = process.env.ADMIN_TELEGRAM_ID;
  if (c.photo_url && chat && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      await getBot().api.sendPhoto(Number(chat), new InputFile(await jpegOf(c.photo_url)), { caption: text.slice(0, 1000), reply_markup: kb });
      return;
    } catch (e) {
      console.error("[telegram] comment photo", e);
    }
  }
  await toAdmins(text, kb);
}

/** Tell the owner about a new pre-order (gelato by the kilo, treats…), with ✅ / ❌ buttons. */
export async function notifyReservation(text: string, id: string) {
  await toAdmins(text, new InlineKeyboard().text("✅ Conferma", `rs:${id}:ok`).text("❌ Rifiuta", `rs:${id}:no`));
}

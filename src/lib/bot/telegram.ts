import "server-only";

import { Bot, InlineKeyboard, type Context } from "grammy";
import { store, type Actor } from "../store";
import { patchRow } from "../mutations";
import { saveImage } from "../upload";
import { detectLang, execute, runAgent, type AgentResult, type Lang, type Photo, type Staged } from "./agent";
import { transcribe } from "./transcribe";

const L: Record<Lang, { heard: string; confirm: string; cancel: string; done: string; cancelled: string; expired: string; error: string; working: string }> = {
  it: { heard: "🎙️ Ho capito:", confirm: "✅ Conferma", cancel: "❌ Annulla", done: "✅ Fatto! Il sito è aggiornato.", cancelled: "❌ Annullato, non ho cambiato niente.", expired: "⏱️ Richiesta scaduta, ripeti pure.", error: "😕 Qualcosa è andato storto:", working: "Un attimo…" },
  pl: { heard: "🎙️ Zrozumiałem:", confirm: "✅ Potwierdź", cancel: "❌ Anuluj", done: "✅ Gotowe! Strona jest zaktualizowana.", cancelled: "❌ Anulowano, nic nie zmieniłem.", expired: "⏱️ Prośba wygasła, powtórz proszę.", error: "😕 Coś poszło nie tak:", working: "Chwileczkę…" },
  en: { heard: "🎙️ I heard:", confirm: "✅ Confirm", cancel: "❌ Cancel", done: "✅ Done! The website is updated.", cancelled: "❌ Cancelled, nothing changed.", expired: "⏱️ This request expired, please repeat.", error: "😕 Something went wrong:", working: "One moment…" },
  es: { heard: "🎙️ He entendido:", confirm: "✅ Confirmar", cancel: "❌ Cancelar", done: "✅ ¡Hecho! La web está actualizada.", cancelled: "❌ Cancelado, no he cambiado nada.", expired: "⏱️ La solicitud caducó, repítela.", error: "😕 Algo salió mal:", working: "Un momento…" },
  de: { heard: "🎙️ Verstanden:", confirm: "✅ Bestätigen", cancel: "❌ Abbrechen", done: "✅ Erledigt! Die Website ist aktualisiert.", cancelled: "❌ Abgebrochen, nichts geändert.", expired: "⏱️ Anfrage abgelaufen, bitte wiederholen.", error: "😕 Etwas ist schiefgelaufen:", working: "Einen Moment…" },
  fr: { heard: "🎙️ J'ai compris :", confirm: "✅ Confirmer", cancel: "❌ Annuler", done: "✅ C'est fait ! Le site est à jour.", cancelled: "❌ Annulé, rien n'a changé.", expired: "⏱️ Demande expirée, répète s'il te plaît.", error: "😕 Un problème :", working: "Un instant…" },
};

const actorOf = (ctx: Context): Actor => ({ actor: `telegram:${ctx.from!.id}${ctx.from?.username ? ` (@${ctx.from.username})` : ""}`, source: "telegram" });

/** Only Telegram users listed in admin_users may talk to the bot; everyone else is ignored silently. */
async function isAdmin(ctx: Context) {
  return Boolean(ctx.from && (await store().adminByTelegram(ctx.from.id)));
}

async function handle(ctx: Context, text: string, photo?: Photo) {
  await ctx.replyWithChatAction("typing").catch(() => {});
  let result: AgentResult;
  try {
    result = await runAgent(text, photo);
  } catch (e) {
    await ctx.reply(`${L.it.error} ${e instanceof Error ? e.message : e}`);
    return;
  }
  const t = L[result.lang];

  if (result.choice) {
    const p = await store().createPending({
      telegram_user_id: ctx.from!.id,
      chat_id: ctx.chat!.id,
      tool: "choice",
      args: { original: text, options: result.choice.options, lang: result.lang, photo: photo ?? null },
      summary: result.choice.question,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
    const kb = new InlineKeyboard();
    result.choice.options.forEach((o, i) => kb.text(o, `ch:${p.id}:${i}`).row());
    await ctx.reply(result.choice.question, { reply_markup: kb });
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
  await ctx.reply(`${result.text}\n\n${result.staged.map((s) => `• ${s.label}`).join("\n")}`, {
    reply_markup: new InlineKeyboard().text(t.confirm, `ok:${p.id}`).text(t.cancel, `no:${p.id}`),
  });
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
      await ctx.reply("Ciao Mauro! Scrivimi o mandami un vocale: «Il pistacchio è finito», «Quante persone oggi?», «Cambia il cono medio a 3,50»…");
      return;
    }
    await handle(ctx, ctx.message.text);
  });

  // a photo (with or without a caption): uploaded first, then the assistant decides where it goes
  bot.on("message:photo", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    await ctx.replyWithChatAction("upload_photo").catch(() => {});
    try {
      const file = await ctx.getFile(); // grammY picks the largest size
      const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
      const saved = await saveImage(await res.arrayBuffer());
      await handle(ctx, ctx.message.caption ?? "", saved);
    } catch (e) {
      await ctx.reply(`${L.it.error} ${e instanceof Error ? e.message : e}`);
    }
  });

  bot.on(["message:voice", "message:audio"], async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    await ctx.replyWithChatAction("typing").catch(() => {});
    try {
      const file = await ctx.getFile();
      const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
      const text = await transcribe(await res.arrayBuffer());
      if (!text) {
        await ctx.reply("🎙️ Non ho sentito niente, riprova.");
        return;
      }
      await ctx.reply(`${L[detectLang(text)].heard} «${text}»`);
      await handle(ctx, text);
    } catch (e) {
      await ctx.reply(`${L.it.error} ${e instanceof Error ? e.message : e}`);
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    if (!(await isAdmin(ctx))) return void ctx.answerCallbackQuery();
    const [kind, id, idx] = ctx.callbackQuery.data.split(":");
    // a visitor's comment: approve / reject straight from the notification
    if (kind === "cm") {
      await ctx.answerCallbackQuery();
      const status = idx === "ok" ? "approved" : "rejected";
      try {
        await patchRow("comments", id, { status }, { ...actorOf(ctx), action: `comment_${status}` });
        await ctx.editMessageText(`${ctx.callbackQuery.message && "text" in ctx.callbackQuery.message ? ctx.callbackQuery.message.text : ""}\n\n${status === "approved" ? "✅ Pubblicato" : "🗑️ Scartato"}`);
      } catch (e) {
        await ctx.reply(`${L.it.error} ${e instanceof Error ? e.message : e}`);
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
    if (kind === "ch") {
      await store().setPendingStatus(id, "confirmed");
      const option = (p.args.options as string[])[Number(idx)];
      await ctx.editMessageText(`${p.summary} → ${option}`);
      await handle(ctx, `${p.args.original}\n(${option})`, (p.args.photo as Photo | null) ?? undefined);
      return;
    }
    if (kind === "ok") {
      await store().setPendingStatus(id, "confirmed");
      await ctx.editMessageText(`${p.summary}\n\n${t.working}`).catch(() => {});
      try {
        for (const s of p.args.staged as Staged[]) await execute(s, actorOf(ctx));
        await ctx.editMessageText(`${p.summary}\n\n${t.done}`);
      } catch (e) {
        await ctx.editMessageText(`${p.summary}\n\n${t.error} ${e instanceof Error ? e.message : e}`);
      }
    }
  });

  bot.catch((err) => console.error("[telegram]", err.error));
  return bot;
}


/** Tell the owner on Telegram that a visitor left a comment, with ✅ / 🗑️ buttons. Silent if Telegram isn't configured. */
export async function notifyComment(c: { id: string; name: string; message: string; flavor_slug: string | null; rating?: number | null }) {
  const chat = process.env.ADMIN_TELEGRAM_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chat) return;
  try {
    await getBot().api.sendMessage(Number(chat), `💬 Nuovo commento sul sito\n\n«${c.message}»\n— ${c.name}${c.flavor_slug ? ` (gusto preferito: ${c.flavor_slug})` : ""}`, {
      reply_markup: new InlineKeyboard().text("✅ Pubblica", `cm:${c.id}:ok`).text("🗑️ Scarta", `cm:${c.id}:no`),
    });
  } catch (e) {
    console.error("[telegram] notifyComment", e);
  }
}

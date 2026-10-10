import "server-only";

import nodemailer from "nodemailer";
import { siteUrl } from "./env";
import { compatChat } from "./llm";
import { store } from "./store";

/**
 * E-mails to the shop's customers, in their own language, in Onda's colors (scoops on top, cream card, a cone at the
 * bottom). Sent from a Gmail account with an "app password" (free, ~500 mails a day):
 *   SMTP_USER=gelateria.onda@gmail.com   SMTP_PASS=xxxx xxxx xxxx xxxx   (optional SMTP_HOST / SMTP_PORT for another provider)
 */
export const canMail = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

let transport: nodemailer.Transporter | null = null;
const mailer = () =>
  (transport ??= process.env.SMTP_HOST
    ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: Number(process.env.SMTP_PORT || 465) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
    : nodemailer.createTransport({ service: "gmail", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }));

export type MailKind = "order_received" | "order_confirmed" | "order_declined" | "order_ready" | "comment_thanks" | "comment_reply" | "custom";
type Lang = "it" | "pl" | "en" | "es" | "de" | "fr";
type Copy = { subject: string; title: string; body: string };

/** The ready-made e-mails ({name} {items} {when} are filled in). */
const COPY: Record<Exclude<MailKind, "custom">, Record<Lang, Copy>> = {
  order_received: {
    it: { subject: "Abbiamo ricevuto la tua prenotazione 🍦", title: "Grazie, {name}!", body: "Abbiamo ricevuto la tua prenotazione. Ti scriviamo appena la confermiamo." },
    pl: { subject: "Otrzymaliśmy Twoją rezerwację 🍦", title: "Dziękujemy, {name}!", body: "Twoja rezerwacja do nas dotarła. Napiszemy, gdy tylko ją potwierdzimy." },
    en: { subject: "We've got your order 🍦", title: "Thank you, {name}!", body: "Your order has reached us. We'll write as soon as we confirm it." },
    es: { subject: "Hemos recibido tu reserva 🍦", title: "¡Gracias, {name}!", body: "Tu reserva nos ha llegado. Te escribimos en cuanto la confirmemos." },
    de: { subject: "Deine Bestellung ist angekommen 🍦", title: "Danke, {name}!", body: "Deine Bestellung ist bei uns angekommen. Wir melden uns, sobald wir sie bestätigen." },
    fr: { subject: "Nous avons reçu ta commande 🍦", title: "Merci, {name} !", body: "Ta commande nous est bien parvenue. On t'écrit dès qu'on la confirme." },
  },
  order_confirmed: {
    it: { subject: "Confermata! Ti aspettiamo 🍨", title: "È confermata, {name}!", body: "La tua prenotazione è confermata: la prepariamo con cura per {when}. A presto!" },
    pl: { subject: "Potwierdzone! Czekamy na Ciebie 🍨", title: "Potwierdzone, {name}!", body: "Twoja rezerwacja jest potwierdzona — przygotujemy ją z sercem na {when}. Do zobaczenia!" },
    en: { subject: "Confirmed! See you soon 🍨", title: "It's confirmed, {name}!", body: "Your order is confirmed — we'll have it lovingly ready for {when}. See you soon!" },
    es: { subject: "¡Confirmada! Te esperamos 🍨", title: "¡Confirmada, {name}!", body: "Tu reserva está confirmada: la tendremos lista con cariño para {when}. ¡Hasta pronto!" },
    de: { subject: "Bestätigt! Wir freuen uns auf dich 🍨", title: "Bestätigt, {name}!", body: "Deine Bestellung ist bestätigt — wir machen sie mit Liebe für {when} fertig. Bis bald!" },
    fr: { subject: "Confirmée ! On t'attend 🍨", title: "C'est confirmé, {name} !", body: "Ta commande est confirmée : on la prépare avec soin pour {when}. À très vite !" },
  },
  order_declined: {
    it: { subject: "La tua prenotazione 🍦", title: "Ci dispiace, {name}", body: "Purtroppo questa volta non riusciamo a preparare la tua prenotazione per quell'orario. Scrivici o passa a trovarci: troviamo insieme un'altra soluzione!" },
    pl: { subject: "Twoja rezerwacja 🍦", title: "Przykro nam, {name}", body: "Niestety tym razem nie damy rady przygotować zamówienia na ten termin. Napisz do nas albo wpadnij — razem znajdziemy inne rozwiązanie!" },
    en: { subject: "About your order 🍦", title: "We're sorry, {name}", body: "Unfortunately we can't prepare your order for that time. Write to us or drop by — we'll find another way together!" },
    es: { subject: "Sobre tu reserva 🍦", title: "Lo sentimos, {name}", body: "Esta vez no podemos preparar tu reserva para esa hora. Escríbenos o pásate: ¡buscamos juntos otra solución!" },
    de: { subject: "Zu deiner Bestellung 🍦", title: "Es tut uns leid, {name}", body: "Leider schaffen wir deine Bestellung zu dieser Zeit nicht. Schreib uns oder komm vorbei — wir finden zusammen eine Lösung!" },
    fr: { subject: "À propos de ta commande 🍦", title: "Désolés, {name}", body: "Cette fois, nous ne pouvons pas préparer ta commande pour cet horaire. Écris-nous ou passe nous voir : on trouvera une autre solution ensemble !" },
  },
  order_ready: {
    it: { subject: "È pronta! 🍨", title: "{name}, è pronta!", body: "La tua prenotazione ti aspetta al banco. Vieni a prenderla quando vuoi!" },
    pl: { subject: "Gotowe do odbioru! 🍨", title: "{name}, gotowe!", body: "Twoje zamówienie czeka przy ladzie. Wpadnij, kiedy chcesz!" },
    en: { subject: "It's ready! 🍨", title: "{name}, it's ready!", body: "Your order is waiting at the counter. Come and pick it up whenever you like!" },
    es: { subject: "¡Está lista! 🍨", title: "¡{name}, está lista!", body: "Tu reserva te espera en el mostrador. ¡Ven a buscarla cuando quieras!" },
    de: { subject: "Fertig zum Abholen! 🍨", title: "{name}, es ist fertig!", body: "Deine Bestellung wartet an der Theke. Hol sie ab, wann du magst!" },
    fr: { subject: "C'est prêt ! 🍨", title: "{name}, c'est prêt !", body: "Ta commande t'attend au comptoir. Viens la chercher quand tu veux !" },
  },
  comment_thanks: {
    it: { subject: "Grazie per il tuo commento 💛", title: "Grazie, {name}!", body: "Il tuo commento ci ha fatto sorridere. Ti scriviamo qui se qualcuno ti risponde." },
    pl: { subject: "Dziękujemy za komentarz 💛", title: "Dziękujemy, {name}!", body: "Twój komentarz wywołał u nas uśmiech. Damy znać tutaj, jeśli ktoś Ci odpowie." },
    en: { subject: "Thanks for your comment 💛", title: "Thank you, {name}!", body: "Your comment made us smile. We'll let you know here if someone replies." },
    es: { subject: "Gracias por tu comentario 💛", title: "¡Gracias, {name}!", body: "Tu comentario nos ha sacado una sonrisa. Te avisamos aquí si alguien te responde." },
    de: { subject: "Danke für deinen Kommentar 💛", title: "Danke, {name}!", body: "Dein Kommentar hat uns ein Lächeln geschenkt. Wir sagen dir hier Bescheid, wenn jemand antwortet." },
    fr: { subject: "Merci pour ton commentaire 💛", title: "Merci, {name} !", body: "Ton commentaire nous a fait sourire. On te prévient ici si quelqu'un te répond." },
  },
  comment_reply: {
    it: { subject: "Onda ti ha risposto 🍦", title: "Ciao {name}!", body: "Abbiamo risposto al tuo commento:" },
    pl: { subject: "Onda Ci odpowiedziała 🍦", title: "Cześć {name}!", body: "Odpowiedzieliśmy na Twój komentarz:" },
    en: { subject: "Onda replied to you 🍦", title: "Hi {name}!", body: "We replied to your comment:" },
    es: { subject: "Onda te ha respondido 🍦", title: "¡Hola {name}!", body: "Hemos respondido a tu comentario:" },
    de: { subject: "Onda hat dir geantwortet 🍦", title: "Hallo {name}!", body: "Wir haben auf deinen Kommentar geantwortet:" },
    fr: { subject: "Onda t'a répondu 🍦", title: "Coucou {name} !", body: "Nous avons répondu à ton commentaire :" },
  },
};
const UI: Record<Lang, { order: string; pickup: string; visit: string; sign: string; yourComment: string }> = {
  it: { order: "La tua prenotazione", pickup: "Ritiro", visit: "Vieni a trovarci", sign: "Con un abbraccio gelato,\nil team di Onda", yourComment: "Il tuo commento" },
  pl: { order: "Twoje zamówienie", pickup: "Odbiór", visit: "Odwiedź nas", sign: "Lodowe uściski,\nzespół Onda", yourComment: "Twój komentarz" },
  en: { order: "Your order", pickup: "Pick-up", visit: "Come and see us", sign: "With a gelato hug,\nthe Onda team", yourComment: "Your comment" },
  es: { order: "Tu reserva", pickup: "Recogida", visit: "Ven a vernos", sign: "Con un abrazo helado,\nel equipo de Onda", yourComment: "Tu comentario" },
  de: { order: "Deine Bestellung", pickup: "Abholung", visit: "Besuch uns", sign: "Eisige Grüße,\ndein Onda-Team", yourComment: "Dein Kommentar" },
  fr: { order: "Ta commande", pickup: "Retrait", visit: "Viens nous voir", sign: "Avec un câlin glacé,\nl'équipe Onda", yourComment: "Ton commentaire" },
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const langOf = (l?: string | null): Lang => (["it", "pl", "en", "es", "de", "fr"].includes(l ?? "") ? (l as Lang) : "it");

/** Onda's e-mail: scoops on top, a cream card, the details in a pastel box, the shop at the bottom. */
export function renderMail(o: { lang: Lang; title: string; body: string; quote?: string; details?: [string, string][]; message?: string; address: string; phone?: string | null }) {
  const ui = UI[o.lang];
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : siteUrl;
  const p = (t: string) => esc(t).replace(/\n/g, "<br>");
  return `<!doctype html><html lang="${o.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#FFE9DA;font-family:'Helvetica Neue',Arial,sans-serif;color:#4B2A20">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFE9DA;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 6px"><img src="${base}/img/mail/scoops.png" width="320" alt="" style="display:block;width:320px;max-width:80%;height:auto"></td></tr>
<tr><td style="background:#FFF7EE;border-radius:28px;padding:34px 30px;box-shadow:0 18px 40px -24px rgba(75,42,32,.45)">
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#F0527F;font-weight:700">Gelateria Onda</p>
<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;color:#4B2A20">${p(o.title)}</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6">${p(o.body)}</p>
${o.message ? `<div style="margin:0 0 18px;padding:16px 18px;border-radius:18px;background:#FFE3EE;font-size:16px;line-height:1.6">🍦 ${p(o.message)}</div>` : ""}
${o.quote ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#4B2A2099;font-weight:700">${ui.yourComment}</p><p style="margin:0 0 18px;padding-left:12px;border-left:3px solid #FF8FB8;font-style:italic;color:#4B2A20cc">«${p(o.quote)}»</p>` : ""}
${o.details?.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#E9FBF5;border-radius:18px"><tr><td style="padding:16px 18px;font-size:15px;line-height:1.6">${o.details.map(([k, v]) => `<b style="color:#2F8F77">${esc(k)}</b><br>${p(v)}`).join("<br><br>")}</td></tr></table>` : ""}
<p style="margin:22px 0 0;font-family:Georgia,serif;font-style:italic;font-size:17px;line-height:1.5;color:#4B2A20cc">${p(ui.sign)}</p>
</td></tr>
<tr><td align="center" style="padding:22px 10px 0;font-size:13px;line-height:1.6;color:#4B2A2099">
<img src="${base}/img/mail/cone.png" height="60" alt="" style="display:block;margin:0 auto 8px;height:60px;width:auto">
<b style="color:#4B2A20">${ui.visit}</b><br>${esc(o.address)}${o.phone ? ` · ${esc(o.phone)}` : ""}<br>
<a href="${base}" style="color:#F0527F;text-decoration:none;font-weight:700">${base.replace(/^https?:\/\//, "")}</a>
</td></tr></table></td></tr></table></body></html>`;
}

/** The owner's own words ("dile che è pronta alle 17"): a model turns them into 2–4 warm sentences in the customer's language. */
async function polish(text: string, lang: Lang, ctx: string) {
  try {
    const r = await compatChat({
      maxTokens: 400,
      deadline: 30_000,
      messages: [
        { role: "system", content: `You write e-mails for Gelateria Onda (artisan gelato shop in Sardinia). Write ONLY the body: 2-4 short, warm, natural sentences in the language "${lang}", saying exactly what the owner wants to say (do not invent facts, prices or times). No greeting line, no sign-off, no subject.` },
        { role: "user", content: `What the owner wants to say: «${text}»\nContext: ${ctx}` },
      ],
    });
    return r.message.content?.trim() || text;
  } catch {
    return text;
  }
}

/** Send one e-mail. `text` = the owner's own words (polished + translated) for "custom", or an extra line for the others. */
export async function sendMail(o: { to: string; kind: MailKind; lang?: string | null; name: string; items?: string; when?: string; quote?: string; reply?: string; text?: string }) {
  if (!canMail()) throw new Error("e-mail non configurata (SMTP_USER / SMTP_PASS)");
  const lang = langOf(o.lang);
  const st = (await store().get("site_settings", 1)) as { address?: string; phone?: string | null } | null;
  const address = st?.address ?? "Via Amsicora 2, Santa Teresa Gallura";
  const v = { name: o.name, items: o.items ?? "", when: o.when ?? "" };
  const details: [string, string][] = [];
  if (o.items) details.push([UI[lang].order, o.items]);
  if (o.when) details.push([UI[lang].pickup, o.when]);
  let subject: string;
  let title: string;
  let body: string;
  let message: string | undefined;
  if (o.kind === "custom") {
    subject = { it: "Un messaggio da Onda 🍦", pl: "Wiadomość od Onda 🍦", en: "A message from Onda 🍦", es: "Un mensaje de Onda 🍦", de: "Eine Nachricht von Onda 🍦", fr: "Un message d'Onda 🍦" }[lang];
    title = { it: `Ciao ${o.name}!`, pl: `Cześć ${o.name}!`, en: `Hi ${o.name}!`, es: `¡Hola ${o.name}!`, de: `Hallo ${o.name}!`, fr: `Coucou ${o.name} !` }[lang];
    body = await polish(o.text ?? "", lang, [o.items && `order: ${o.items}`, o.when && `pick-up: ${o.when}`, o.quote && `their comment: ${o.quote}`].filter(Boolean).join("; ") || "none");
  } else {
    const c = COPY[o.kind][lang];
    subject = fill(c.subject, v);
    title = fill(c.title, v);
    body = fill(c.body, v);
    if (o.reply) message = o.reply;
    if (o.text) message = await polish(o.text, lang, details.map((d) => d.join(": ")).join("; "));
  }
  await mailer().sendMail({
    from: { name: "Gelateria Onda", address: process.env.SMTP_USER! },
    replyTo: process.env.SMTP_USER,
    to: o.to,
    subject,
    html: renderMail({ lang, title, body, quote: o.quote, details, message, address, phone: st?.phone }),
    text: [title, body, message, ...details.map((d) => d.join(": ")), UI[lang].sign].filter(Boolean).join("\n\n"),
  });
  return { subject };
}

/** A pick-up time in the customer's language. */
export const whenIn = (iso: string, lang?: string | null) => new Date(iso).toLocaleString(langOf(lang), { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/* ─── customers' addresses (private table "contacts") ─────────────────────── */

export type Contact = { ref_id: string; kind: "reservation" | "comment" | "message"; email: string; name: string | null; lang: string | null; note?: string | null };

export async function saveContact(c: Contact) {
  try {
    await store().put("contacts", { ...c, created_at: new Date().toISOString() });
  } catch (e) {
    console.error("[mail] contact not saved (run the contacts migration?)", (e as Error).message);
  }
}

export async function contactOf(refId: string): Promise<Contact | null> {
  try {
    return ((await store().get("contacts", refId)) as Contact | null) ?? null;
  } catch {
    return null;
  }
}

import "server-only";

import { translate } from "./ai";
import { siteUrl } from "./env";
import { compatChat } from "./llm";
import { patchRow } from "./mutations";
import { store, type Actor } from "./store";
import type { Comment } from "./types";

const SYSTEM: Actor = { actor: "comments", source: "system" };
const NEW_COLUMNS = ["photo_url", "likes", "parent_id", "reply", "reply_at", "message_i18n"] as const;

/**
 * Is it fine to show at once? A free model reads the text (and looks at the photo): spam, insults, adult or violent
 * content → no. If no model answers, the comment simply waits for the owner (never published blindly with a photo).
 */
export async function moderate(text: string, photoUrl?: string | null): Promise<boolean> {
  const content = [
    { type: "text" as const, text: `A visitor wants to post this on a family gelato shop's website. Reply with exactly "ok" if it is fine to publish (friendly, a normal opinion, any language${photoUrl ? ", and the photo is a normal photo: food, people, a place" : ""}), or "no" if it contains insults, hate, spam/ads, adult or violent content, or personal data of others.\n\nText: «${text.slice(0, 600)}»` },
    ...(photoUrl ? [{ type: "image_url" as const, image_url: { url: photoUrl } }] : []),
  ];
  try {
    const r = await compatChat({ vision: Boolean(photoUrl), maxTokens: 5, deadline: 25_000, messages: [{ role: "user", content }] });
    return /^\s*ok/i.test(r.message.content ?? "");
  } catch {
    return !photoUrl && !/(https?:|www\.|@\w)/i.test(text); // no AI right now: text-only friendly ones still go up
  }
}

/** Save a comment; if the database does not have the new columns yet (migration not run), save it without them. */
export async function saveComment(row: Record<string, unknown>) {
  try {
    return await store().put("comments", row);
  } catch (e) {
    if (!/column|schema cache/i.test(String((e as Error).message))) throw e;
    if (row.parent_id) throw e; // a reply without its parent would look like a new comment: refuse instead
    const slim = Object.fromEntries(Object.entries(row).filter(([k]) => !(NEW_COLUMNS as readonly string[]).includes(k)));
    return store().put("comments", slim);
  }
}

/** The comment in every language (shown in the visitor's own; "show original" is one tap away). */
export async function translateComment(id: string) {
  const c = (await store().get("comments", id)) as Comment | null;
  if (!c || c.message_i18n || !("message_i18n" in c)) return;
  try {
    const tr = await translate({ message: c.message });
    if (tr.message) await patchRow("comments", id, { message_i18n: tr.message }, { ...SYSTEM, action: "comment_translated" });
  } catch {
    /* stays in its own language */
  }
}

/** The owner's answer (typed or spoken on Telegram), translated, under the comment. */
export async function replyToComment(id: string, text: string, actor: Actor) {
  const tr = await translate({ reply: text }).catch(() => ({}) as Record<string, never>);
  const reply = (tr as { reply?: Record<string, string> }).reply ?? { it: text };
  await patchRow("comments", id, { reply, reply_at: new Date().toISOString(), status: "approved" }, { ...actor, action: "comment_reply" });
  // the visitor left an e-mail: tell them, in their language
  const { canMail, contactOf, sendMail } = await import("./mail");
  const who = await contactOf(id);
  const c = (await store().get("comments", id)) as Comment | null;
  if (who && c && canMail()) {
    const lang = who.lang ?? c.locale ?? "it";
    await sendMail({ to: who.email, kind: "comment_reply", lang, name: c.name, quote: c.message, reply: (reply as Record<string, string>)[lang] ?? text }).catch((e) => console.error("[mail]", e));
  }
}

/** Refresh the cached page in a request of its own (work done after a response cannot revalidate). */
export async function refreshSiteCache() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return;
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : siteUrl;
  await fetch(`${base}/api/revalidate`, { method: "POST", headers: { "x-revalidate-secret": secret } }).catch(() => {});
}

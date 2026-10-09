/**
 * Points the Telegram bot at the deployed site.
 *   TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… NEXT_PUBLIC_SITE_URL=https://… npm run bot:webhook
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const site = process.env.NEXT_PUBLIC_SITE_URL;
if (!token || !secret || !site) {
  console.error("Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_SITE_URL first.");
  process.exit(1);
}
const url = `${site.replace(/\/$/, "")}/api/telegram`;
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message", "callback_query"], drop_pending_updates: true }),
});
console.log(url, await res.json());

export {};

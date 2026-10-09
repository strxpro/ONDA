import "server-only";

/**
 * WhatsApp message to the owner through CallMeBot (free, for personal notifications).
 * Setup once: from the owner's phone send "I allow callmebot to send me messages" to the CallMeBot number
 * (see callmebot.com → WhatsApp), then set CALLMEBOT_PHONE (+39…) and CALLMEBOT_APIKEY. Silent when not configured.
 */
export async function notifyWhatsApp(text: string) {
  const phone = process.env.CALLMEBOT_PHONE;
  const key = process.env.CALLMEBOT_APIKEY;
  if (!phone || !key) return;
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`;
    await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    console.error("[whatsapp]", e);
  }
}

import "server-only";

import { allFlavors, allPrices } from "../ops";

/**
 * Speech-to-text for Telegram voice notes (OGG/Opus).
 * - GROQ_API_KEY set → Groq whisper-large-v3 (the accurate one; the faster turbo only when it is busy) — free tier
 * - otherwise OPENAI_API_KEY → OpenAI gpt-4o-transcribe
 * Accuracy: temperature 0, and a prompt with the shop's own words (flavors, treats, the owner's usual commands in
 * Italian and Polish), so "pistacchio", "Yellow Submarine", "coppetta", "rożek" come out right.
 */
export async function transcribe(audio: ArrayBuffer, filename = "voice.ogg"): Promise<string> {
  const groq = process.env.GROQ_API_KEY;
  const key = groq || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Manca GROQ_API_KEY (gratis) o OPENAI_API_KEY: non posso trascrivere i vocali.");
  const url = groq ? "https://api.groq.com/openai/v1/audio/transcriptions" : "https://api.openai.com/v1/audio/transcriptions";
  const models = groq ? [process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3", "whisper-large-v3-turbo"] : [process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe"];
  const [flavors, prices] = await Promise.all([allFlavors(), allPrices()]);
  const words = [...flavors.map((f) => f.name.it), ...prices.filter((p) => p.price_group === "delizie").map((p) => p.label.it)].join(", ");
  // whisper reads only the last ~224 tokens of the prompt: the shop's words go last
  const prompt = `Gelateria Onda, Santa Teresa Gallura. Cono, coppetta, vaschetta, gusto firma, finito, galleria, foto, ingredienti, prenotazioni. Rożek, kubek, kuweta, smak, skończył się, zdjęcie, tło, składniki, cena, euro. ${words}.`.slice(-900);

  let last = 0;
  for (const model of models) {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/ogg" }), filename);
    form.append("model", model);
    form.append("temperature", "0");
    form.append("prompt", prompt);
    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(40_000) }).catch(() => null);
    if (res?.ok) {
      const json = (await res.json()) as { text?: string };
      return (json.text ?? "").trim();
    }
    last = res?.status ?? 0;
  }
  throw new Error(`Trascrizione fallita (${last})`);
}

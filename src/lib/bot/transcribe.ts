import "server-only";

import { allFlavors } from "../ops";

/**
 * Speech-to-text for Telegram voice notes (OGG/Opus).
 * - GROQ_API_KEY set → Groq whisper-large-v3-turbo (free tier, more than enough for a shop's voice notes)
 * - otherwise OPENAI_API_KEY → OpenAI gpt-4o-transcribe
 * Both speak the same API. The current flavor names are passed as a prompt so "pistacchio" or "Yellow Submarine" come out right.
 */
export async function transcribe(audio: ArrayBuffer, filename = "voice.ogg"): Promise<string> {
  const groq = process.env.GROQ_API_KEY;
  const key = groq || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Manca GROQ_API_KEY (gratis) o OPENAI_API_KEY: non posso trascrivere i vocali.");
  const url = groq ? "https://api.groq.com/openai/v1/audio/transcriptions" : "https://api.openai.com/v1/audio/transcriptions";
  const model = groq ? process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo" : process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe";
  const names = (await allFlavors()).map((f) => f.name.it).join(", ");
  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/ogg" }), filename);
  form.append("model", model);
  form.append("prompt", `Gelateria Onda, Santa Teresa Gallura. Gusti: ${names}. Cono, coppetta, vaschetta, euro, banner.`);
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!res.ok) throw new Error(`Trascrizione fallita (${res.status})`);
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}

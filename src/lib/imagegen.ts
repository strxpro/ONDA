import "server-only";

import { ingredientKey, ingredientPhoto, setOwnIngredientPhotos } from "./ingredients";
import { compatChat } from "./llm";
import { setIngredientPhoto } from "./ops";
import { store, type Actor } from "./store";
import { saveImage } from "./upload";

/**
 * Free image generation for ingredient photos (the round bubbles next to each flavor). First that works:
 *   Cloudflare Workers AI  CF_ACCOUNT_ID + CF_API_TOKEN   (FLUX schnell, free daily allowance — the best)
 *   Hugging Face           HF_TOKEN                        (FLUX schnell, small free monthly credit)
 *   Pollinations           POLLINATIONS_TOKEN              (free account at enter.pollinations.ai)
 */
export const canGenerateImages = () => Boolean((process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) || process.env.HF_TOKEN || process.env.POLLINATIONS_TOKEN);

const promptFor = (what: string) =>
  `Professional food photography of ${what}, a small natural heap of the fresh ingredient, centered, seen from a 3/4 angle, soft warm daylight, clean plain light cream background, shallow depth of field, appetizing, high detail, no text, no people`;

async function cloudflare(prompt: string): Promise<Buffer | null> {
  const acc = process.env.CF_ACCOUNT_ID;
  const tok = process.env.CF_API_TOKEN;
  if (!acc || !tok) return null;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acc}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: "POST",
    headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
    body: JSON.stringify({ prompt, steps: 8 }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { result?: { image?: string } };
  return j.result?.image ? Buffer.from(j.result.image, "base64") : null;
}

async function huggingface(prompt: string): Promise<Buffer | null> {
  const tok = process.env.HF_TOKEN;
  if (!tok) return null;
  const res = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell", {
    method: "POST",
    headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
    body: JSON.stringify({ inputs: prompt }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok || !res.headers.get("content-type")?.startsWith("image")) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function pollinations(prompt: string): Promise<Buffer | null> {
  const tok = process.env.POLLINATIONS_TOKEN;
  if (!tok) return null;
  const res = await fetch(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux&width=768&height=768&nologo=true`, { headers: { authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(50_000) });
  if (!res.ok || !res.headers.get("content-type")?.startsWith("image")) return null;
  return Buffer.from(await res.arrayBuffer());
}

export async function generateImage(prompt: string): Promise<Buffer | null> {
  for (const gen of [cloudflare, huggingface, pollinations]) {
    try {
      const img = await gen(prompt);
      if (img && img.byteLength > 5000) return img;
    } catch {
      /* next one */
    }
  }
  return null;
}

/** Every ingredient written in flavors / treats (Italian), and whether it already has a photo. */
export async function ingredientsWithoutPhoto(): Promise<string[]> {
  const [flavors, items, st] = await Promise.all([store().list("flavors"), store().list("price_items"), store().get("site_settings", 1)]);
  setOwnIngredientPhotos(((st as { texts?: Record<string, { it?: string }> } | null)?.texts ?? {}) as Record<string, { it?: string }>);
  const names = new Map<string, string>();
  for (const row of [...(flavors as { ingredients?: Record<string, string>; deleted_at?: string | null }[]), ...(items as { ingredients?: Record<string, string> }[])]) {
    if ("deleted_at" in row && row.deleted_at) continue;
    for (const n of (row.ingredients?.it ?? "").split(/[,;·]| e /)) {
      const name = n.trim().replace(/\.$/, "");
      if (name.length > 2 && name.length < 40) names.set(ingredientKey(name), name);
    }
  }
  return [...names.values()].filter((n) => !ingredientPhoto(n));
}

/** Make photos for these ingredients (or all missing ones) and use them on the website. Returns what was made. */
export async function generateIngredientPhotos(list: string[] | null, actor: Actor, max = 6): Promise<{ made: string[]; failed: string[] }> {
  const names = (list?.length ? list : await ingredientsWithoutPhoto()).slice(0, max);
  if (!names.length) return { made: [], failed: [] };
  // the image models understand English best: translate the names once
  let english: Record<string, string> = {};
  try {
    const r = await compatChat({
      json: true,
      maxTokens: 300,
      deadline: 20_000,
      messages: [
        { role: "system", content: 'Translate gelato ingredient names to short English food descriptions for an image prompt. JSON {"<original>":"<english>"}.' },
        { role: "user", content: JSON.stringify(names) },
      ],
    });
    english = JSON.parse(r.message.content ?? "{}");
  } catch {
    /* use the names as they are */
  }
  const made: string[] = [];
  const failed: string[] = [];
  for (const name of names) {
    const img = await generateImage(promptFor(english[name] || name));
    if (!img) {
      failed.push(name);
      continue;
    }
    const saved = await saveImage(img);
    await setIngredientPhoto(name, saved.url, actor);
    made.push(name);
  }
  return { made, failed };
}

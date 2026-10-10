import "server-only";

/**
 * Which model understands the owner. Claude (ANTHROPIC_API_KEY) — or a CHAIN of free OpenAI-compatible models.
 * Every free provider whose key is set joins the chain; when one is busy, out of its daily quota, slow or broken,
 * the next one answers — silently, the owner never sees an error for that:
 *   groq       GROQ_API_KEY        console.groq.com           (also transcribes voice notes; qwen also sees photos)
 *   cerebras   CEREBRAS_API_KEY    cloud.cerebras.ai          (1M tokens / day)
 *   gemini     GEMINI_API_KEY      aistudio.google.com        (sees photos)
 *   openrouter OPENROUTER_API_KEY  openrouter.ai              (the ":free" models)
 *   mistral    MISTRAL_API_KEY     console.mistral.ai         (free "Experiment" plan; sees photos)
 *   xai        XAI_API_KEY         (Grok, paid)
 *   pollinations — no key at all, the last resort
 * <NAME>_MODELS="a,b" overrides a provider's models; AI_ORDER="gemini,groq,…" overrides the order.
 */
export type Provider = "anthropic" | "compat";

type Slot = { provider: string; url: string; key?: string; model: string; vision: boolean };

const PROVIDERS: { name: string; url: string; env?: string; models: string[]; vision: (model: string) => boolean }[] = [
  { name: "groq", url: "https://api.groq.com/openai/v1", env: "GROQ_API_KEY", models: [process.env.GROQ_MODEL || "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"], vision: (m) => /qwen3\.8|llama-4|vision/i.test(m) },
  { name: "cerebras", url: "https://api.cerebras.ai/v1", env: "CEREBRAS_API_KEY", models: ["gpt-oss-120b", "qwen-3-235b-a22b-instruct-2507"], vision: () => false },
  { name: "gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai", env: "GEMINI_API_KEY", models: [process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", "gemini-3.8-flash"], vision: () => true },
  { name: "openrouter", url: "https://openrouter.ai/api/v1", env: "OPENROUTER_API_KEY", models: ["nvidia/nemotron-3-super-120b-a12b:free", "google/gemma-4-31b-it:free", "nvidia/nemotron-3-ultra-550b-a55b:free"], vision: (m) => /gemma|vision|vl|omni/i.test(m) },
  { name: "mistral", url: "https://api.mistral.ai/v1", env: "MISTRAL_API_KEY", models: ["mistral-small-latest"], vision: () => true },
  { name: "xai", url: "https://api.x.ai/v1", env: "XAI_API_KEY", models: [process.env.XAI_MODEL || "grok-4"], vision: () => true },
  { name: "pollinations", url: "https://text.pollinations.ai/openai", models: ["openai"], vision: () => true },
];

function slots(): Slot[] {
  const order = process.env.AI_ORDER?.split(",").map((s) => s.trim()) ?? [];
  const list = [...PROVIDERS].sort((a, b) => (order.indexOf(a.name) + 1 || 99) - (order.indexOf(b.name) + 1 || 99));
  return list.flatMap((p) => {
    const key = p.env ? process.env[p.env] : undefined;
    if (p.env && !key) return [];
    const override = process.env[`${p.name.toUpperCase()}_MODELS`]?.split(",").map((x) => x.trim()).filter(Boolean);
    const models = (override?.length ? override : p.models).filter((v, i, a) => a.indexOf(v) === i);
    return models.map((model) => ({ provider: p.name, url: p.url, key, model, vision: p.vision(model) }));
  });
}

/** slots that recently failed or hit a limit rest until then (remembered on this server instance) */
const restUntil = new Map<string, number>();
const id = (s: Slot) => `${s.provider}/${s.model}`;
const rest = (s: Slot, seconds: number) => restUntil.set(id(s), Date.now() + seconds * 1000);

export function provider(): Provider | null {
  if (process.env.AI_PROVIDER === "anthropic" || (!process.env.AI_PROVIDER && process.env.ANTHROPIC_API_KEY)) return "anthropic";
  return "compat"; // pollinations needs no key, so there is always someone to ask
}

/* ─── OpenAI-compatible chat ─────────────────────────────────────────────── */

export type CompatTool = {
  type: "function";
  function: { name: string; description?: string; parameters: unknown };
};
export type CompatToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type CompatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | ContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: CompatToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type Choice = { message: { content: string | null; tool_calls?: CompatToolCall[] }; finish_reason: string };

/** Thrown only when every free model failed — the bot turns it into a calm "try again in a minute". */
export class AllBusyError extends Error {
  constructor(detail: string) {
    super(`AI_BUSY ${detail}`);
  }
}

/**
 * Ask the chain. `vision` = only models that see images; `skipFirst` = an earlier answer was empty, start one later;
 * `deadline` = give up (with AllBusyError) after that many ms in total.
 */
export async function compatChat(body: { messages: CompatMessage[]; tools?: CompatTool[]; json?: boolean; maxTokens?: number; skipFirst?: boolean; vision?: boolean; deadline?: number }): Promise<Choice> {
  const start = Date.now();
  const deadline = body.deadline ?? 75_000;
  const all = slots().filter((s) => !body.vision || s.vision);
  const errors: string[] = [];
  let skip = body.skipFirst;
  for (let round = 0; round < 4; round++) {
    // who is free now; if nobody, wait for the first one back (a per-minute limit) — if that fits in the time left
    const now = Date.now();
    let queue = all.filter((s) => (restUntil.get(id(s)) ?? 0) <= now);
    if (!queue.length) {
      const soonest = Math.min(...all.map((s) => restUntil.get(id(s)) ?? 0));
      if (soonest - now > deadline - (now - start) - 8000) break;
      await new Promise((r) => setTimeout(r, soonest - now + 300));
      queue = all.filter((s) => (restUntil.get(id(s)) ?? 0) <= Date.now());
    }
    if (skip && queue.length > 1) queue = [...queue.slice(1), queue[0]];
    skip = false;
    const answer = await tryQueue(queue, body, start, deadline, errors);
    if (answer) return answer;
  }
  throw new AllBusyError(errors.join(", ") || "no model");
}

async function tryQueue(queue: Slot[], body: Parameters<typeof compatChat>[0], start: number, deadline: number, errors: string[]): Promise<Choice | null> {
  for (const s of queue) {
    const left = deadline - (Date.now() - start);
    if (left < 3000) break;
    try {
      const res = await fetch(`${s.url}/chat/completions`, {
        method: "POST",
        headers: { ...(s.key ? { authorization: `Bearer ${s.key}` } : {}), "content-type": "application/json" },
        body: JSON.stringify({
          model: s.model,
          messages: body.messages,
          temperature: 0.2,
          max_tokens: body.maxTokens ?? 2000,
          ...(body.tools?.length ? { tools: body.tools, tool_choice: "auto" } : {}),
          ...(body.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(Math.min(40_000, left)),
      });
      if (!res.ok) {
        const text = await res.text();
        errors.push(`${id(s)} ${res.status}`);
        if (res.status === 429) {
          const wait = Number(res.headers.get("retry-after")) || Number(/try again in (?:(\d+)m)?([\d.]+)s/.exec(text)?.slice(1).reduce((t, v, i) => t + (Number(v) || 0) * (i === 0 ? 60 : 1), 0)) || 12;
          rest(s, /per day|TPD|RPD|daily/i.test(text) ? Math.max(wait, 3600) : wait);
        } else if (res.status === 404 || res.status === 401 || res.status === 403) rest(s, 6 * 3600); // gone / no access: not today
        else if (res.status === 413) rest(s, 30); // too big for its per-minute window
        else rest(s, 60); // 5xx, a 400 it does not like (schema, tools…): someone else
        continue;
      }
      const data = (await res.json()) as { usage?: { prompt_tokens: number; completion_tokens: number }; choices?: Choice[] };
      const choice = data.choices?.[0];
      if (!choice?.message) {
        errors.push(`${id(s)} empty`);
        rest(s, 30);
        continue;
      }
      if (process.env.NODE_ENV !== "production") console.log(`[llm] ${id(s)} in=${data.usage?.prompt_tokens} out=${data.usage?.completion_tokens}`);
      return choice;
    } catch (e) {
      errors.push(`${id(s)} ${(e as Error).name}`);
      rest(s, 60); // timeout / network
    }
  }
  return null;
}

/** What a photo shows, in one short English sentence (subject, colors, background) — for finding it by words later. */
export async function describeImage(url: string): Promise<string | null> {
  try {
    const r = await compatChat({
      vision: true,
      maxTokens: 120,
      deadline: 40_000,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this photo for a search index in ONE short sentence: the main subject, what people/objects are there, the main colors and the background color. No intro." },
            { type: "image_url", image_url: { url } },
          ],
        },
      ],
    });
    return r.message.content?.trim().replace(/\s+/g, " ").slice(0, 300) || null;
  } catch {
    return null;
  }
}

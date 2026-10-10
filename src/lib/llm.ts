import "server-only";

/**
 * Which model understands the owner. Claude (ANTHROPIC_API_KEY) or a free / OpenAI-compatible one:
 *   groq   — GROQ_API_KEY   (free tier; the same key also transcribes voice notes)   model GROQ_MODEL   (openai/gpt-oss-120b)
 *   gemini — GEMINI_API_KEY (free tier at aistudio.google.com)                       model GEMINI_MODEL (gemini-2.5-flash)
 *   xai    — XAI_API_KEY    (Grok, paid credits)                                     model XAI_MODEL    (grok-4)
 * AI_PROVIDER forces one; otherwise the first configured of anthropic → groq → gemini → xai.
 */
export type Provider = "anthropic" | "groq" | "gemini" | "xai";

const COMPAT = {
  groq: {
    url: "https://api.groq.com/openai/v1",
    key: "GROQ_API_KEY",
    model: () => process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai",
    key: "GEMINI_API_KEY",
    model: () => process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
  xai: {
    url: "https://api.x.ai/v1",
    key: "XAI_API_KEY",
    model: () => process.env.XAI_MODEL || "grok-4",
  },
} as const;

const blockedUntil = new Map<string, number>();

/** The models to try, in order (each has its own free limits on Groq). GROQ_MODELS="a,b,c" overrides. */
function modelsFor(p: Exclude<Provider, "anthropic">) {
  if (p === "groq") {
    const list = process.env.GROQ_MODELS?.split(",").map((x) => x.trim()).filter(Boolean);
    return list?.length ? list : [COMPAT.groq.model(), "openai/gpt-oss-20b", "qwen/qwen3.8-27b"].filter((v, i, a) => a.indexOf(v) === i);
  }
  return [COMPAT[p].model()];
}

export function provider(): Provider | null {
  const forced = process.env.AI_PROVIDER as Provider | undefined;
  if (forced) return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  for (const p of ["groq", "gemini", "xai"] as const) if (process.env[COMPAT[p].key]) return p;
  return null;
}

/* ─── OpenAI-compatible chat (Groq, Gemini, xAI) ─────────────────────────── */

export type CompatTool = {
  type: "function";
  function: { name: string; description?: string; parameters: unknown };
};
export type CompatToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
export type CompatMessage =
  { role: "system" | "user"; content: string } | { role: "assistant"; content: string | null; tool_calls?: CompatToolCall[] } | { role: "tool"; tool_call_id: string; content: string };

export async function compatChat(body: { messages: CompatMessage[]; tools?: CompatTool[]; json?: boolean; maxTokens?: number; skipFirst?: boolean }) {
  const p = provider();
  if (!p || p === "anthropic") throw new Error("compatChat needs groq, gemini or xai");
  const c = COMPAT[p];
  const key = process.env[c.key];
  if (!key) throw new Error(`Manca ${c.key}`);
  // free tiers have per-minute AND per-day limits. A short wait (per-minute) → wait and retry the same model;
  // a long one (the day's tokens are used up) → move on to the next model of the chain right away.
  // models whose daily limit is used up are skipped until they reset (remembered on this server instance)
  const models = modelsFor(p).filter((x) => (blockedUntil.get(x) ?? 0) < Date.now());
  if (!models.length) models.push(...modelsFor(p));
  let res: Response | undefined;
  let m = body.skipFirst && models.length > 1 ? 1 : 0;
  for (let attempt = 0; attempt < 6 && m < models.length; attempt++) {
    res = await fetch(`${c.url}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: models[m],
        messages: body.messages,
        temperature: 0.2,
        max_tokens: body.maxTokens ?? 2000,
        ...(body.tools?.length ? { tools: body.tools, tool_choice: "auto" } : {}),
        ...(body.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (res.status === 404 || (res.status === 400 && /model/i.test(await res.clone().text()))) {
      m++; // this model is gone or does not exist here: try the next one
      continue;
    }
    if (res.status === 413) {
      m++; // too big for this model's per-minute input limit: the next one may take it
      continue;
    }
    if (res.status !== 429) break;
    const text = await res.clone().text();
    const wait = Number(res.headers.get("retry-after")) || Number(/try again in (?:(\d+)m)?([\d.]+)s/.exec(text)?.slice(1).reduce((t, v, i) => t + (Number(v) || 0) * (i === 0 ? 60 : 1), 0)) || 5;
    if (wait > 12 || /per day|TPD|RPD/i.test(text)) {
      if (/per day|TPD|RPD/i.test(text)) blockedUntil.set(models[m], Date.now() + Math.max(wait, 60) * 1000);
      m++;
      continue;
    }
    await new Promise((r) => setTimeout(r, (wait + 0.5) * 1000));
  }
  res = res!;
  if (!res.ok) throw new Error(`${p} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    usage?: { prompt_tokens: number; completion_tokens: number };
    choices: {
      message: { content: string | null; tool_calls?: CompatToolCall[] };
      finish_reason: string;
    }[];
  };
  if (process.env.NODE_ENV !== "production") console.log(`[llm] ${models[m]} in=${data.usage?.prompt_tokens} out=${data.usage?.completion_tokens}`);
  return data.choices[0];
}

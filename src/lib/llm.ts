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

export async function compatChat(body: { messages: CompatMessage[]; tools?: CompatTool[]; json?: boolean; maxTokens?: number }) {
  const p = provider();
  if (!p || p === "anthropic") throw new Error("compatChat needs groq, gemini or xai");
  const c = COMPAT[p];
  const key = process.env[c.key];
  if (!key) throw new Error(`Manca ${c.key}`);
  // free tiers are limited per minute: on 429 wait what the provider asks (max ~20 s) and try again
  let res: Response | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(`${c.url}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: c.model(),
        messages: body.messages,
        temperature: 0.2,
        max_tokens: body.maxTokens ?? 2000,
        ...(body.tools?.length ? { tools: body.tools, tool_choice: "auto" } : {}),
        ...(body.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (res.status !== 429 || attempt === 3) break;
    const wait = Number(res.headers.get("retry-after")) || Number(/try again in ([\d.]+)s/.exec(await res.text())?.[1]) || 5;
    await new Promise((r) => setTimeout(r, Math.min(20, wait + 0.5) * 1000));
  }
  res = res!;
  if (!res.ok) throw new Error(`${p} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    choices: {
      message: { content: string | null; tool_calls?: CompatToolCall[] };
      finish_reason: string;
    }[];
  };
  return data.choices[0];
}

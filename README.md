# Gelateria Onda

Website, admin panel and Telegram voice bot for **Gelateria Onda — La Gelateria Artigianale**, Via Amsicora 2, Santa Teresa Gallura.

Next.js 15 · Tailwind v4 · GSAP + Lenis · Motion · Supabase · grammY · Claude API · next-intl (IT · PL · EN · ES · DE · FR).

## Quick start (no database needed)

```bash
npm install
npm run dev
```

- Site: http://localhost:3000 (→ `/it`)
- Admin: http://localhost:3000/admin

Without Supabase env vars everything runs on a **local file store** (`.data/onda.json`, created from
[`src/content/seed.ts`](src/content/seed.ts)) and live updates go over server-sent events. The admin is open on
localhost in this mode. Delete `.data/` to reset to the seed.

## How it fits together

```
admin panel ─┐                                   ┌─> audit_log (every change, undoable)
             ├─> lib/mutations (validate + write) ┼─> Supabase Realtime / SSE ─> open browsers animate the change
Telegram bot ┘        (lib/ops for shop actions)  └─> revalidateTag (fresh HTML for new visitors)
```

- Every write goes through `src/lib/mutations.ts`: Zod validation → store → `audit_log` (before/after) → live push.
- Undo (admin → Cronologia, or "annulla l'ultima modifica" to the bot) restores the "before" rows; multi-row changes undo together.
- The public page keeps all content in a client store (`SiteDataProvider`) and patches it from Realtime, so a sold-out
  flavor gets its stamp, a price rolls, a banner slides in — no reload.

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | production data, auth, realtime, photo storage |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | the bot |
| `ANTHROPIC_API_KEY` | bot understanding + automatic translations / flavor colors (model: `claude-opus-5-5`) |
| `OPENAI_API_KEY` | voice-note transcription (`gpt-4o-transcribe`) |
| `ANALYTICS_SALT` | cookieless visitor hashing |
| `NEXT_PUBLIC_SITE_URL` | webhook URL, links |
| `ADMIN_EMAIL`, `ADMIN_TELEGRAM_ID` | first admin (seed / local mode) |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` | optional: real Google rating, review count and latest reviews |

Without `ANTHROPIC_API_KEY` the admin still works; new texts are copied to every language instead of translated.

## Database (Supabase)

1. Create a project (EU region).
2. Push schema + seed:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   ADMIN_EMAIL=mauro@… ADMIN_TELEGRAM_ID=123456789 npm run db:seed-sql
   npm run db:push
   ```
   Or, without the CLI: `ADMIN_EMAIL=… ADMIN_TELEGRAM_ID=… npm run db:all`, then paste `supabase/all-in-one.sql`
   (every migration + seed + the owner row, one transaction) into Supabase → SQL Editor → Run.
3. Authentication → URL configuration: add `<site>/admin/auth/callback` to redirect URLs.
4. More admins: `insert into admin_users (email, telegram_user_id, display_name) values (…);`

RLS: public content is read-only for everyone (Realtime needs it); no write policies exist — all writes use the
service role on the server, after the admin/bot identity check.

## Telegram bot

1. @BotFather → `/newbot` → copy the token to `TELEGRAM_BOT_TOKEN`. Make up a long random `TELEGRAM_WEBHOOK_SECRET`.
2. Get Mauro's Telegram user id (e.g. from @userinfobot) and put it in `admin_users.telegram_user_id`.
3. After deploying: `npm run bot:webhook` (uses `.env.local`).

The brain can be free: with only `GROQ_API_KEY` set, Groq both transcribes voice notes and decides the tools
(`openai/gpt-oss-120b`). `GEMINI_API_KEY` (Google AI Studio, free tier) or `XAI_API_KEY` (Grok) work too; with
`ANTHROPIC_API_KEY` it uses Claude. See `src/lib/llm.ts`.

What it does: voice note → transcript ("🎙️ Ho capito: …") → the model decides which tools to call. Reads (stats, lists, hours)
are answered right away. **Changes are only staged**: the bot replies with a summary and ✅ / ❌ buttons; nothing changes
until ✅. Ambiguous names get a question with buttons. Names match across languages ("pistacja" = "pistacchio").
Strangers are ignored silently; the webhook checks Telegram's secret header.

Test the bot logic locally without Telegram:

```bash
curl -X POST localhost:3000/api/dev/bot -H "content-type: application/json" -d '{"text":"Il pistacchio è finito","confirm":true}'
curl -X POST localhost:3000/api/dev/bot -H "content-type: application/json" -d '{"tool":"update_price","args":{"item":"duży kubek","price_eur":5},"confirm":true}'
```

(The first needs an AI key — `GROQ_API_KEY` is enough; the second skips the AI and tests matching + execution.)

## Admin (`/admin`)

Mobile-first, Italian. Oggi (stats + quick "finito" switches) · Gusti · Prezzi · Orari · Banner · Galleria (upload →
WebP) · Testi e dati · Recensioni (manual or Google sync) · Sezioni (show/hide, reorder) · Animazioni (intensity,
gallery speed, melt speed, preloader, cursor, sprinkles, smooth scroll) · Cronologia (undo).

**Reviews from the counter (NFC / QR → `/it?recensione`).** The card asks for stars first. 4–5★ get a prominent
"Scrivi la recensione su Google" button (`google_review_url` in Recensioni, e.g.
`https://search.google.com/local/writereview?placeid=…`; falls back to the Maps link) plus an optional note for the
wall. 1–3★ become private feedback for the owner (pending; publish it from Commenti if you like). Everyone can still
reach Google: Google's policy forbids "review gating" (sending only happy customers to Google), so the link is never
hidden from low ratings. Write the same URL on an NFC sticker to make the stand "tap to review".

## Before launch — verify with the owner

- [ ] **All prices** (placeholders)
- [ ] Seasonal opening hours (seeded 10:30–22:30 daily)
- [ ] Map pin, direct Tripadvisor URL, Google place id + "write a review" link (admin → Recensioni)
- [ ] Supabase: apply `20261009000006_review_stars.sql`
- [ ] "Il Laboratorio" wording, flavor descriptions
- [ ] **Replace the gallery placeholder photos** (Unsplash) with Gelateria Onda's own photos
- [ ] Add real reviews (or connect Google) — never invent any
- [ ] "Shardana Nuragici" credit logo (text only for now)

## Windows note

`next-intl` depends on `@swc/core`; its 1.16 releases refuse to load when the binding cache folder has broad ACLs (seen
in sandboxed shells). `package.json` pins 1.15.47 via `overrides`.

## Scripts

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | checks |
| `npm run db:seed-sql` / `db:push` | Supabase seed + push |
| `npm run bot:webhook` | register the Telegram webhook |

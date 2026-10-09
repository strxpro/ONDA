# Bot Telegram: jak go podłączyć (krok po kroku)

Mauro mówi albo pisze do bota, np. „pistacja się skończyła”, „ile osób było dziś na stronie?”, „zmień średni rożek na 3,50”.
Bot rozumie każdy język. Pokazuje, co zamierza zrobić, i czeka na ✅. Strona zmienia się w ciągu sekundy (Supabase Realtime).
Na Telegram przychodzą też nowe komentarze gości z przyciskami **✅ Pubblica / 🗑️ Scarta**.

## Co jest potrzebne i ile to kosztuje

| Usługa | Do czego | Koszt |
|---|---|---|
| **Vercel** (plan Hobby) | hosting strony + adres https dla bota | za darmo |
| **Supabase** (plan Free) | baza danych + aktualizacje na żywo | za darmo |
| **Telegram** (@BotFather) | sam bot | za darmo |
| **Groq** (console.groq.com) | zamiana głosówek na tekst (Whisper) | za darmo (limit wystarcza dla sklepu) |
| **Anthropic** (console.anthropic.com) | „mózg” bota (Claude) | płatne za użycie, przy kilkudziesięciu poleceniach dziennie zwykle kilka euro miesięcznie |

Część „AI rozumie polecenie” nie ma w pełni darmowej wersji o tej jakości. Wszystko inne jest darmowe.

## 1. Bot w Telegramie (2 min)
1. W Telegramie otwórz **@BotFather** → `/newbot` → nazwa np. „Onda Gelateria” → login np. `onda_gelateria_bot`.
2. Skopiuj **token**, to `TELEGRAM_BOT_TOKEN`.
3. Otwórz **@userinfobot** z telefonu Mauro → skopiuj jego **Id** (liczba), to `ADMIN_TELEGRAM_ID`.

## 2. Klucze AI (5 min)
1. **console.groq.com** → API Keys → Create → `GROQ_API_KEY`.
2. **console.anthropic.com** → Settings → API Keys → Create → `ANTHROPIC_API_KEY` (doładuj np. 5 $).

## 3. Baza Supabase (5 min)
1. **supabase.com** → New project (region: Frankfurt).
2. W folderze projektu: `npx supabase link` i `npm run db:push`. To tworzy tabele i wgrywa smaki i godziny.
3. Project Settings → API: skopiuj `URL`, `anon key`, `service_role key`.

## 4. Publikacja na Vercel (5 min)
1. Wrzuć projekt na GitHub → **vercel.com** → Add New Project → wybierz repozytorium.
2. W „Environment Variables” wklej wszystko z `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (dowolne 32+ znaków), `ADMIN_TELEGRAM_ID`, `ADMIN_EMAIL`,
   `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `ANALYTICS_SALT` (dowolne 32+ znaków), `NEXT_PUBLIC_SITE_URL` (adres strony).
3. Deploy.

## 5. Połącz bota ze stroną (1 min)
Lokalnie, z tymi samymi zmiennymi w `.env.local`:

```bash
npm run bot:webhook
```

Gotowe. Napisz do bota `/start`, potem wyślij głosówkę.

## Przykłady poleceń
- „Il pistacchio è finito” / „Pistacja się skończyła” → oznacza jako wyprzedane
- „Dodaj smak mango, sorbet, żółty” → nowy smak (z tłumaczeniami na 6 języków)
- „Dziś mamy: pistacja, czekolada, Yellow Submarine” → ustawia dzisiejsze smaki
- „Jutro zamykamy o 18” → wyjątek w godzinach
- „Ile osób było na stronie w tym tygodniu?” → statystyki
- „Cofnij” → cofa ostatnią zmianę

### Wszystko inne na stronie
- **Zdjęcie smaku**: wyślij zdjęcie z podpisem „to jest pistacja” → zdjęcie trafia do smaku
- **Galeria**: wyślij zdjęcie lady / lodów / ludzi z podpisem „do galerii” → nowe zdjęcie w „Il Laboratorio”
- „Dodaj do innych pyszności crêpe z Nutellą za 5 euro” (+ zdjęcie) → nowa pozycja w „Altre delizie”
- „Ukryj granitę” / „Granita znowu jest” → pokazuje/ukrywa pozycję
- „Składniki cytryny: cytryny z Sardynii, cukier” / „Mango to sorbet” → składniki i kategoria smaku
- „Są nowe komentarze?” → lista czekających komentarzy; „Opublikuj komentarz Luki” / „Opublikuj wszystkie” / „Usuń ten o …”
- (nowy komentarz sam przychodzi na Telegram z przyciskami ✅ Pubblica / 🗑️ Scarta)
- „Zmień napis na pasku na: …”, „Zmień tytuł sekcji smaków na …” → teksty strony (tłumaczone na 6 języków)
- „Ukryj sekcję z opiniami”, „Mniej animacji”, „Wyłącz preloader” → sekcje i animacje

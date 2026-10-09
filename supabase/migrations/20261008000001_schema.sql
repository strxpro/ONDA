-- Gelateria Onda — core schema
-- i18n text columns are jsonb objects: { "it": "...", "pl": "...", "en": "...", "es": "...", "de": "...", "fr": "..." }

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ─── helpers ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── admin_users ────────────────────────────────────────────────────────────
create table public.admin_users (
  id               uuid primary key default gen_random_uuid(),
  email            text unique,
  telegram_user_id bigint unique,
  display_name     text,
  role             text not null default 'owner' check (role in ('owner', 'editor')),
  created_at       timestamptz not null default now(),
  constraint admin_users_has_identity check (email is not null or telegram_user_id is not null)
);

-- Is the current Supabase Auth user an admin? Used by RLS read policies for the admin panel.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ─── site_settings (singleton) ──────────────────────────────────────────────
create table public.site_settings (
  id                     smallint primary key default 1 check (id = 1),
  name                   text not null,
  tagline                jsonb not null default '{}'::jsonb,
  -- every editable piece of copy (hero, about, lab, footer, section headings…), keyed → i18n
  texts                  jsonb not null default '{}'::jsonb,
  phone                  text,
  address                text,
  maps_url               text,
  lat                    double precision,
  lng                    double precision,
  socials                jsonb not null default '{}'::jsonb,   -- { facebook: url, instagram: url }
  rating_google            numeric(2,1) check (rating_google between 0 and 5),
  rating_google_count      integer,
  rating_google_url        text,
  rating_tripadvisor       numeric(2,1) check (rating_tripadvisor between 0 and 5),
  rating_tripadvisor_count integer,
  rating_tripadvisor_url   text,
  theme                  jsonb not null default '{}'::jsonb,   -- token overrides, e.g. { "pistachio": "#B8D8A8" }
  motion                 jsonb not null default '{}'::jsonb,   -- micro-animation settings (see MotionSettings in src/lib/types.ts)
  timezone               text not null default 'Europe/Rome',
  updated_at             timestamptz not null default now()
);
create trigger site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ─── flavors ────────────────────────────────────────────────────────────────
create table public.flavors (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               jsonb not null,
  description        jsonb not null default '{}'::jsonb,
  ingredients        jsonb not null default '{}'::jsonb,
  color_primary      text not null default '#FFF6EC' check (color_primary ~* '^#[0-9a-f]{6}$'),
  color_secondary    text not null default '#FFFFFF' check (color_secondary ~* '^#[0-9a-f]{6}$'),
  category           text not null default 'crema' check (category in ('crema', 'frutta', 'speciali', 'sorbetti')),
  tags               text[] not null default '{}'
                     check (tags <@ array['vegan','gluten_free','lactose_free','new','signature']::text[]),
  is_available_today boolean not null default true,
  is_featured        boolean not null default false,
  sort_order         integer not null default 0,
  image_url          text,
  scoop_texture      text not null default 'smooth' check (scoop_texture in ('smooth', 'chunks', 'swirl')),
  deleted_at         timestamptz,                    -- soft delete
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index flavors_sort_idx on public.flavors (sort_order) where deleted_at is null;
create trigger flavors_updated before update on public.flavors
  for each row execute function public.set_updated_at();

-- ─── price_items ────────────────────────────────────────────────────────────
create table public.price_items (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       jsonb not null,
  price_group text not null check (price_group in ('coni', 'coppette', 'vaschette', 'extra')),
  size        text,                                 -- e.g. 'piccolo', 'medio', 'grande', '500g'
  max_scoops  smallint check (max_scoops between 1 and 6),   -- drives the "Crea il tuo cono" configurator
  price_eur   numeric(6,2) not null check (price_eur >= 0),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);
create trigger price_items_updated before update on public.price_items
  for each row execute function public.set_updated_at();

-- ─── opening hours ──────────────────────────────────────────────────────────
-- weekday: ISO 1 = Monday … 7 = Sunday
create table public.opening_hours (
  weekday    smallint primary key check (weekday between 1 and 7),
  open_time  time,
  close_time time,
  is_closed  boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint opening_hours_times check (is_closed or (open_time is not null and close_time is not null))
);
create trigger opening_hours_updated before update on public.opening_hours
  for each row execute function public.set_updated_at();

create table public.special_days (
  date       date primary key,
  note       jsonb not null default '{}'::jsonb,
  open_time  time,
  close_time time,
  is_closed  boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint special_days_times check (is_closed or (open_time is not null and close_time is not null))
);
create trigger special_days_updated before update on public.special_days
  for each row execute function public.set_updated_at();

-- ─── announcements ──────────────────────────────────────────────────────────
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  text       jsonb not null,
  color      text not null default '#FFE89A' check (color ~* '^#[0-9a-f]{6}$'),
  starts_at  timestamptz,
  ends_at    timestamptz,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger announcements_updated before update on public.announcements
  for each row execute function public.set_updated_at();

-- ─── sections ───────────────────────────────────────────────────────────────
create table public.sections (
  key        text primary key,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create trigger sections_updated before update on public.sections
  for each row execute function public.set_updated_at();

-- ─── gallery ────────────────────────────────────────────────────────────────
create table public.gallery (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  width      integer,
  height     integer,
  alt        jsonb not null default '{}'::jsonb,
  color      text not null default '#FF8FB8' check (color ~* '^#[0-9a-f]{6}$'),  -- drip / ring color in the gallery orbit
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger gallery_updated before update on public.gallery
  for each row execute function public.set_updated_at();

-- ─── reviews (real ones only: entered by the owner or synced from Google Places) ──
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  source      text not null check (source in ('google', 'tripadvisor', 'other')),
  external_id text unique,                   -- e.g. Google review resource name, for idempotent sync
  author      text not null,
  rating      numeric(2,1) not null check (rating between 1 and 5),
  text        text not null,
  language    text,
  review_date date,
  url         text,
  is_visible  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

-- ─── analytics (cookieless) ─────────────────────────────────────────────────
-- visitor_hash = sha256(daily_salt + ip + user_agent); the raw IP/UA are never stored.
create table public.page_views (
  id           bigint generated always as identity primary key,
  path         text not null,
  visitor_hash text not null,
  referrer     text,
  country      text,
  device       text check (device in ('mobile', 'tablet', 'desktop', 'bot', 'unknown')),
  locale       text,
  created_at   timestamptz not null default now()
);
create index page_views_created_idx on public.page_views (created_at desc);

-- ─── audit log ──────────────────────────────────────────────────────────────
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor       text not null,                 -- admin email or "telegram:<user_id>"
  source      text not null check (source in ('admin', 'telegram', 'system')),
  action      text not null,                 -- e.g. 'update_price', 'set_flavor_availability', 'undo'
  table_name  text not null,
  row_id      text,
  before      jsonb,                         -- null = row was inserted
  after       jsonb,                         -- null = row was deleted
  undone_at   timestamptz,
  undo_of     bigint references public.audit_log (id),
  batch_id    uuid,                          -- groups multi-row changes (e.g. replace_today_flavors) for one-step undo
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- ─── Telegram bot: pending confirmations (webhook is stateless) ─────────────
create table public.bot_pending_actions (
  id               uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  chat_id          bigint not null,
  tool             text not null,
  args             jsonb not null,
  summary          text not null,
  status           text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '15 minutes'
);

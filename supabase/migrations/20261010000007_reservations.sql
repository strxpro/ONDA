-- Pre-orders from the site (gelato by the kilo, tubs, treats). Private: no public policy, never in Realtime.
-- Written by the server (service role) after validation; the owner gets a Telegram (and optional WhatsApp) message.
create table public.reservations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  phone      text not null check (char_length(phone) between 5 and 30),
  items      text not null check (char_length(items) between 1 and 500),
  pickup_at  timestamptz not null,
  notes      text check (char_length(notes) <= 400),
  locale     text,
  status     text not null default 'new' check (status in ('new', 'confirmed', 'declined', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reservations_pickup_idx on public.reservations (pickup_at desc);
create trigger reservations_updated before update on public.reservations
  for each row execute function public.set_updated_at();
alter table public.reservations enable row level security;
create policy "admin read" on public.reservations for select using (public.is_admin());

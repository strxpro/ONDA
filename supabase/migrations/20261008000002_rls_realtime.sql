-- Row Level Security
-- Public content: anyone may READ (anon key on the site + Realtime).
-- Nobody may WRITE through the anon/authenticated keys: all writes go through
-- server Route Handlers using the service role, which bypasses RLS and writes audit_log.

alter table public.admin_users          enable row level security;
alter table public.site_settings        enable row level security;
alter table public.flavors              enable row level security;
alter table public.price_items          enable row level security;
alter table public.opening_hours        enable row level security;
alter table public.special_days         enable row level security;
alter table public.announcements        enable row level security;
alter table public.sections             enable row level security;
alter table public.gallery              enable row level security;
alter table public.reviews              enable row level security;
alter table public.page_views           enable row level security;
alter table public.audit_log            enable row level security;
alter table public.bot_pending_actions  enable row level security;

-- Public read. Soft-deleted / inactive rows stay readable on purpose: Realtime only
-- delivers an UPDATE when the new row passes the select policy, and the site needs
-- that event to animate a flavor out. The rows hold no private data.
create policy "public read" on public.site_settings for select using (true);
create policy "public read" on public.flavors       for select using (true);
create policy "public read" on public.price_items   for select using (true);
create policy "public read" on public.opening_hours for select using (true);
create policy "public read" on public.special_days  for select using (true);
create policy "public read" on public.announcements for select using (true);
create policy "public read" on public.sections      for select using (true);
create policy "public read" on public.gallery       for select using (true);
create policy "public read" on public.reviews       for select using (true);

-- Private tables: readable only by signed-in admins (admin panel, live audit log).
create policy "admin read" on public.admin_users for select to authenticated using (public.is_admin());
create policy "admin read" on public.audit_log   for select to authenticated using (public.is_admin());
create policy "admin read" on public.page_views  for select to authenticated using (public.is_admin());
-- bot_pending_actions: service role only (no policies).

-- ─── Realtime ───────────────────────────────────────────────────────────────
alter publication supabase_realtime add table
  public.site_settings,
  public.flavors,
  public.price_items,
  public.opening_hours,
  public.special_days,
  public.announcements,
  public.sections,
  public.gallery,
  public.reviews,
  public.audit_log;

-- ─── Storage: public gallery bucket (uploads go through the server) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do nothing;

create policy "public read gallery" on storage.objects
  for select using (bucket_id = 'gallery');

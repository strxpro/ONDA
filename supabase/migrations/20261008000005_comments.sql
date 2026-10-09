-- Visitors' "tasty comments": anyone can leave one from the site, it shows up only after the owner approves it.
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  message     text not null check (char_length(message) between 2 and 280),
  flavor_slug text,                                   -- favorite flavor, optional
  sticker     text not null default 'heart' check (sticker in ('heart', 'star', 'smile', 'yum')),
  locale      text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index comments_status_idx on public.comments (status, created_at desc);
create trigger comments_updated before update on public.comments
  for each row execute function public.set_updated_at();

alter table public.comments enable row level security;
-- the public sees approved comments only; inserts go through the server (service role) with validation + anti-spam
create policy "public read approved" on public.comments for select using (status = 'approved');
alter publication supabase_realtime add table public.comments;

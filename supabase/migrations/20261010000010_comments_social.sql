-- Comments get social: a photo (shown in a scoop-shaped frame), likes, visitors' replies (parent_id),
-- the owner's answer (in 6 languages, written or spoken on Telegram) and the comment translated for every visitor.
alter table public.comments
  add column if not exists photo_url text,
  add column if not exists likes integer not null default 0 check (likes >= 0),
  add column if not exists parent_id uuid references public.comments(id) on delete cascade,
  add column if not exists reply jsonb,
  add column if not exists reply_at timestamptz,
  add column if not exists message_i18n jsonb;
create index if not exists comments_parent_idx on public.comments (parent_id);

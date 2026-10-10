-- Customers' e-mail addresses (for order / comment e-mails), kept apart from the public tables:
-- RLS on and no policy = only the server (service role) can read or write them.
create table if not exists public.contacts (
  ref_id     uuid primary key,          -- the reservation or comment it belongs to
  kind       text not null check (kind in ('reservation', 'comment', 'message')),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name       text,
  lang       text,
  note       text,                      -- a visitor's message (original words), for 'message'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.contacts enable row level security;

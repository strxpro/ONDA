-- "Altre delizie": other treats (affogato, frappè, granita…) live in price_items with a photo and a short description.
alter table public.price_items drop constraint if exists price_items_price_group_check;
alter table public.price_items add constraint price_items_price_group_check
  check (price_group in ('coni', 'coppette', 'vaschette', 'extra', 'delizie'));
alter table public.price_items add column if not exists image_url text;
alter table public.price_items add column if not exists description jsonb;

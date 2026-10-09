-- What the "Altre delizie" treats are made of (shown in their pop-up; editable by voice).
alter table public.price_items add column if not exists ingredients jsonb;

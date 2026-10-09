-- Star rating on visitors' comments (1–3 stay private for the owner unless approved) + the direct Google "write a review" link.
alter table public.comments add column rating smallint check (rating between 1 and 5);
alter table public.site_settings add column google_review_url text;

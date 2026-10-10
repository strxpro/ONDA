-- Allergens the owner confirms per flavor (EU list relevant to gelato). Empty = the site reads them from the ingredients ("indicative").
alter table public.flavors add column if not exists allergens text[] not null default '{}'
  check (allergens <@ array['milk','eggs','nuts','peanuts','gluten','soy','sesame','sulphites']::text[]);

-- Analytics + fuzzy lookup helpers. Executable by the service role only.

-- Visit statistics between two instants.
create or replace function public.get_stats(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with v as (
    select * from public.page_views
    where created_at >= p_from and created_at < p_to and device is distinct from 'bot'
  )
  select jsonb_build_object(
    'visits',   (select count(*) from v),
    'visitors', (select count(distinct visitor_hash) from v),
    'top_pages', coalesce((select jsonb_agg(t) from (
        select path, count(*) as views from v group by path order by views desc limit 10) t), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(t) from (
        select coalesce(device, 'unknown') as device, count(*) as views from v group by 1 order by views desc) t), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(t) from (
        select coalesce(country, '??') as country, count(*) as views from v group by 1 order by views desc limit 10) t), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(t order by t.day) from (
        select (created_at at time zone 'Europe/Rome')::date as day, count(*) as views,
               count(distinct visitor_hash) as visitors
        from v group by 1) t), '[]'::jsonb)
  );
$$;

-- Fuzzy flavor lookup across every language ("pistacchio" ≈ "pistachio" ≈ "pistacja").
create or replace function public.match_flavor(p_query text, p_limit int default 3)
returns table (id uuid, slug text, name jsonb, score real)
language sql stable security definer set search_path = public, extensions as $$
  select f.id, f.slug, f.name,
         greatest(
           similarity(unaccent(lower(p_query)), unaccent(lower(f.slug))),
           (select max(similarity(unaccent(lower(p_query)), unaccent(lower(value))))
              from jsonb_each_text(f.name))
         ) as score
  from public.flavors f
  where f.deleted_at is null
  order by score desc
  limit p_limit;
$$;

revoke all on function public.get_stats(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.match_flavor(text, int)             from public, anon, authenticated;

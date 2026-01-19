-- =========================
-- Phase 2 FIX: Hard reset functions (removes any old references to services.city)
-- =========================

-- 0) Ensure column exists on service_events (you already have it, this is safe)
alter table public.service_events
  add column if not exists city text;

-- 1) Drop old functions (so no stale body remains)
drop function if exists public.record_service_event(uuid, text);
drop function if exists public.get_most_demanded_services(text[], int);

-- 2) Recreate record_service_event WITHOUT referencing services.city
create function public.record_service_event(
  p_service_id uuid,
  p_event_type text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city text;
  v_row jsonb;
  v_city_id uuid;
begin
  if p_event_type not in ('view','call','whatsapp') then
    raise exception 'invalid event_type: %', p_event_type;
  end if;

  select to_jsonb(s) into v_row
  from public.services s
  where s.id = p_service_id;

  if v_row is null then
    return;
  end if;

  -- Prefer services.city if it exists; otherwise use city_id -> cities lookup
  v_city := nullif(v_row->>'city', '');

  if v_city is null then
    begin
      v_city_id := nullif(v_row->>'city_id', '')::uuid;
      if v_city_id is not null then
        select coalesce(c.name_ar, c.name) into v_city
        from public.cities c
        where c.id = v_city_id;
      end if;
    exception when others then
      v_city := null;
    end;
  end if;

  insert into public.service_events(service_id, event_type, city)
  values (p_service_id, p_event_type, v_city);

  if p_event_type = 'view' then
    update public.services
      set views_count = coalesce(views_count, 0) + 1
      where id = p_service_id;
  elsif p_event_type = 'call' then
    update public.services
      set call_clicks = coalesce(call_clicks, 0) + 1
      where id = p_service_id;
  elsif p_event_type = 'whatsapp' then
    update public.services
      set whatsapp_clicks = coalesce(whatsapp_clicks, 0) + 1
      where id = p_service_id;
  end if;
end;
$$;

grant execute on function public.record_service_event(uuid, text) to anon;
grant execute on function public.record_service_event(uuid, text) to authenticated;

-- 3) Recreate get_most_demanded_services WITHOUT referencing services.city
create function public.get_most_demanded_services(
  p_city_names text[] default null,
  p_limit int default 6
) returns table (
  id uuid,
  title text,
  category text,
  provider_name text,
  provider_phone text,
  allow_whatsapp boolean,
  city text,
  sub_city text,
  image_url text,
  demand_score bigint,
  views_14d bigint,
  call_14d bigint,
  whatsapp_14d bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz;
  v_cnt bigint;
begin
  v_since := now() - interval '14 days';

  select count(*) into v_cnt
  from public.service_events
  where created_at >= v_since
    and (p_city_names is null or public.service_events.city = any(p_city_names));
  if coalesce(v_cnt, 0) < 20 then
    v_since := now() - interval '30 days';
  end if;

  return query
  with agg as (
    select
      se.service_id,
      sum(case when se.event_type = 'view' then 1 else 0 end)::bigint as views_cnt,
      sum(case when se.event_type = 'call' then 1 else 0 end)::bigint as call_cnt,
      sum(case when se.event_type = 'whatsapp' then 1 else 0 end)::bigint as wa_cnt
    from public.service_events se
    where se.created_at >= v_since
      and (p_city_names is null or se.city = any(p_city_names))
    group by se.service_id
  ),
  svc as (
    select s.*, to_jsonb(s) as j
    from public.services s
  ),
  enriched as (
    select
      s.id,
      s.title,
      s.category,
      s.provider_name,
      s.provider_phone,
      coalesce(s.allow_whatsapp, true) as allow_whatsapp,

      -- City: prefer services.city if present, else cities lookup via city_id
      coalesce(
        nullif(s.j->>'city',''),
        (select coalesce(c.name_ar, c.name)
         from public.cities c
         where c.id = nullif(s.j->>'city_id','')::uuid)
      ) as city,

      -- Sub-city: prefer services.sub_city if present, else sub_cities lookup via sub_city_id (if you have it)
      coalesce(
        nullif(s.j->>'sub_city',''),
        (select coalesce(sc.name_ar, sc.name)
         from public.sub_cities sc
         where sc.id = nullif(s.j->>'sub_city_id','')::uuid)
      ) as sub_city,

      s.image_url,

      (coalesce(a.call_cnt, 0) * 3 + coalesce(a.wa_cnt, 0) * 3 + coalesce(a.views_cnt, 0))::bigint as demand_score,
      coalesce(a.views_cnt, 0)::bigint as views_14d,
      coalesce(a.call_cnt, 0)::bigint as call_14d,
      coalesce(a.wa_cnt, 0)::bigint as whatsapp_14d

    from agg a
    join svc s on s.id = a.service_id
    where s.exclude_from_demand is not true
      and s.is_active = true
      and s.is_visible = true
      and s.is_paused = false
      and s.approval_status = 'approved'
      and coalesce(s.j->>'deleted_at','') = ''
  ),
  ranked as (
    select
      *,
      row_number() over (partition by category order by demand_score desc, views_14d desc, id asc) as cat_rank
    from enriched
  )
  select
    id, title, category, provider_name, provider_phone, allow_whatsapp, city, sub_city, image_url,
    demand_score, views_14d, call_14d, whatsapp_14d
  from ranked
  where cat_rank <= 2
  order by demand_score desc, views_14d desc, id asc
  limit greatest(1, p_limit);
end;
$$;

grant execute on function public.get_most_demanded_services(text[], int) to anon;
grant execute on function public.get_most_demanded_services(text[], int) to authenticated;

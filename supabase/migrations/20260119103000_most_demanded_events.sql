-- Phase 2: System "Most Demanded" + event tracking (views/calls/whatsapp)

-- 1) Extend services with click counters + moderation flag
alter table public.services
  add column if not exists call_clicks bigint not null default 0,
  add column if not exists whatsapp_clicks bigint not null default 0,
  add column if not exists exclude_from_demand boolean not null default false;

-- 2) Raw event log (kept minimal)
create table if not exists public.service_events (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  event_type text not null check (event_type in ('view','call','whatsapp')),
  city text null,
  created_at timestamptz not null default now()
);

create index if not exists service_events_service_id_created_at_idx
  on public.service_events(service_id, created_at desc);

create index if not exists service_events_city_created_at_idx
  on public.service_events(city, created_at desc);

create index if not exists service_events_event_type_created_at_idx
  on public.service_events(event_type, created_at desc);

-- 3) Record a single event (SECURITY DEFINER so anon browsing can log events)
create or replace function public.record_service_event(
  p_service_id uuid,
  p_event_type text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city text;
begin
  if p_event_type not in ('view','call','whatsapp') then
    raise exception 'invalid event_type: %', p_event_type;
  end if;

  select city into v_city
  from public.services
  where id = p_service_id;

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

  return;
end;
$$;

grant execute on function public.record_service_event(uuid, text) to anon;
grant execute on function public.record_service_event(uuid, text) to authenticated;

-- 4) Compute "Most Demanded" (SYSTEM) per city, rolling 14 days (fallback 30)
create or replace function public.get_most_demanded_services(
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
    and (p_city_names is null or city = any(p_city_names));

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
  scored as (
    select
      s.id,
      s.title,
      s.category,
      coalesce(s.provider_name, '') as provider_name,
      coalesce(s.provider_phone, '') as provider_phone,
      coalesce(s.allow_whatsapp, true) as allow_whatsapp,
      s.city,
      s.sub_city,
      s.image_url,
      (coalesce(a.call_cnt, 0) * 3 + coalesce(a.wa_cnt, 0) * 3 + coalesce(a.views_cnt, 0) * 1)::bigint as demand_score,
      coalesce(a.views_cnt, 0)::bigint as views_14d,
      coalesce(a.call_cnt, 0)::bigint as call_14d,
      coalesce(a.wa_cnt, 0)::bigint as whatsapp_14d
    from agg a
    join public.services s on s.id = a.service_id
    where s.exclude_from_demand is not true
      and s.is_active = true
      and s.is_visible = true
      and s.is_paused = false
      and s.approval_status = 'approved'
      and s.deleted_at is null
  ),
  ranked as (
    select
      *,
      row_number() over (partition by category order by demand_score desc, views_14d desc, id asc) as cat_rank
    from scored
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

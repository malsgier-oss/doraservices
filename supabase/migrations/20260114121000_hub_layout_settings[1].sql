-- Hub Layout Settings (Admin-controlled)
-- Provides per-city (optional) toggles + ordering for Hub sections.

-- JSON format example for sections:
-- {
--   "order": ["banner","services","shelves","active"],
--   "enabled": {"banner": true, "services": true, "shelves": true, "active": true}
-- }

create table if not exists public.hub_layout_settings (
  id uuid primary key default gen_random_uuid(),
  city_id uuid null references public.cities(id) on delete set null,
  sections jsonb not null default jsonb_build_object(
    'order', jsonb_build_array('banner','services','shelves','active'),
    'enabled', jsonb_build_object('banner', true, 'services', true, 'shelves', true, 'active', true)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hub_layout_settings_city_unique
  on public.hub_layout_settings ((coalesce(city_id::text,'__default__')));

alter table public.hub_layout_settings enable row level security;

-- Helper: is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Public can read hub layout settings" on public.hub_layout_settings;
create policy "Public can read hub layout settings"
  on public.hub_layout_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage hub layout settings" on public.hub_layout_settings;
create policy "Admins can manage hub layout settings"
  on public.hub_layout_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_hub_layout_settings_updated_at on public.hub_layout_settings;
create trigger set_hub_layout_settings_updated_at
before update on public.hub_layout_settings
for each row
execute function public.set_updated_at();

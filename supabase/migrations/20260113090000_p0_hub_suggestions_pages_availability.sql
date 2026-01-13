-- P0: Hub suggestions + site pages + provider availability
-- Safe to run multiple times (uses IF NOT EXISTS where possible)

-- Provider availability fields on profiles
alter table if exists public.profiles
  add column if not exists availability_status text default 'offline',
  add column if not exists availability_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_availability_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_availability_status_check
      check (availability_status in ('available','busy','offline'));
  end if;
end $$;

-- Hub suggestions (cities + chips)
create table if not exists public.hub_suggestions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('city','chip')),
  label_en text,
  label_ar text,
  display_order integer default 0,
  is_active boolean default true,
  city_key text,
  action_type text check (action_type in ('category','subcategory','search')),
  action_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Site pages (about/contact/terms/privacy)
create table if not exists public.site_pages (
  slug text primary key,
  title_en text,
  title_ar text,
  content_en text,
  content_ar text,
  is_published boolean default false,
  updated_at timestamptz not null default now()
);

-- Seed default pages if missing
insert into public.site_pages (slug, title_en, title_ar, content_en, content_ar, is_published)
values
  ('about', 'About Dora', 'عن Dora', 'Dora is a service-first marketplace for Libya.', 'Dora هي منصة خدمات تركز على السرعة والثقة داخل ليبيا.', true),
  ('contact', 'Contact', 'تواصل معنا', 'Email: support@dora.ly\nWhatsApp: +218...', 'البريد: support@dora.ly\nواتساب: +218...', true),
  ('terms', 'Terms', 'الشروط', 'Terms will be added here.', 'سيتم إضافة الشروط هنا.', true),
  ('privacy', 'Privacy', 'الخصوصية', 'Privacy policy will be added here.', 'سيتم إضافة سياسة الخصوصية هنا.', true)
on conflict (slug) do nothing;

-- RLS
alter table public.hub_suggestions enable row level security;
alter table public.site_pages enable row level security;

-- Anyone can read active hub suggestions
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='hub_suggestions' and policyname='Public can read active hub suggestions') then
    create policy "Public can read active hub suggestions"
      on public.hub_suggestions
      for select
      using (is_active = true);
  end if;
end $$;

-- Admins can manage hub suggestions (assumes profiles.role = 'admin')
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='hub_suggestions' and policyname='Admins can manage hub suggestions') then
    create policy "Admins can manage hub suggestions"
      on public.hub_suggestions
      for all
      using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

-- Anyone can read published site pages
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_pages' and policyname='Public can read published site pages') then
    create policy "Public can read published site pages"
      on public.site_pages
      for select
      using (is_published = true);
  end if;
end $$;

-- Admins can manage site pages
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_pages' and policyname='Admins can manage site pages') then
    create policy "Admins can manage site pages"
      on public.site_pages
      for all
      using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

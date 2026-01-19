-- Phase 3: Global Guides (admin-controlled)
-- Cards on Hub (no CTA). Tap opens a drawer with full content.

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  icon_key text not null default 'ClipboardCheck',

  -- Content (Arabic required; English optional)
  title_ar text not null,
  title_en text null,

  -- Summary lines shown on the card (must be exactly 2 in Arabic; English optional)
  summary_lines_ar text[] not null default array[]::text[],
  summary_lines_en text[] null,

  -- Full content shown in the drawer
  bullets_ar text[] not null default array[]::text[],
  bullets_en text[] null,

  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint guides_summary_lines_ar_len check (array_length(summary_lines_ar, 1) = 2),
  constraint guides_summary_lines_en_len check (summary_lines_en is null or array_length(summary_lines_en, 1) = 2)
);

-- Keep updated_at current
create trigger guides_set_updated_at
before update on public.guides
for each row execute function public.update_updated_at_column();

-- Row level security
alter table public.guides enable row level security;

-- Public can read only active guides; admins can read all.
create policy "Guides are readable when active" on public.guides
for select
using (is_active = true or public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can manage guides
create policy "Admins manage guides" on public.guides
for all
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Grants (RLS still applies)
grant select on table public.guides to anon, authenticated;
grant insert, update, delete on table public.guides to authenticated;

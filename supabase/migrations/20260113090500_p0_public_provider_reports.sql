-- P0: Allow anonymous provider reports (reporter_id nullable)
-- This assumes table public.user_reports exists and has reporter_id column.

alter table if exists public.user_reports
  alter column reporter_id drop not null;

alter table public.user_reports enable row level security;

-- Public can insert anonymous reports (reporter_id is null)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_reports' and policyname='Public can submit anonymous reports') then
    create policy "Public can submit anonymous reports"
      on public.user_reports
      for insert
      with check (reporter_id is null);
  end if;
end $$;

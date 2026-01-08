-- Backfill provider_status for legacy business users.
--
-- Some profiles created before provider_status defaults/policies can have NULL (or empty) provider_status.
-- That can cause admin/provider listings and Hub enrichment to show empty results.

update public.profiles
set provider_status = 'pending'
where role = 'business'
  and (provider_status is null or provider_status = '');

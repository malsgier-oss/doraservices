-- Dora P0: Provider can choose whether WhatsApp contact is allowed.
-- If disabled, WhatsApp CTA is hidden across the app for that service.

alter table public.services
  add column if not exists allow_whatsapp boolean not null default true;

-- Backfill any existing NULLs defensively (shouldn't happen due to NOT NULL + default).
update public.services
  set allow_whatsapp = true
  where allow_whatsapp is null;

comment on column public.services.allow_whatsapp is
  'If false, hide WhatsApp contact actions for this service/provider.';

-- Drop the old constraint and add a new one that includes all used statuses
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_status_check CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text, 'paused'::text, 'expired'::text, 'scheduled'::text, 'archived'::text]));
-- =============================================================================
-- Kinetix 0005 — live updates for the host portal
-- Lets the admin pages hear about new/changed registrations instantly
-- (Supabase Realtime). Nothing extra is stored: changes are streamed, not saved.
-- Realtime still applies RLS, so only admins receive registration events.
-- Only `registrations` is published; `sessions` has private columns (court,
-- arrival info) that must never be streamed to the public.
-- Run after 0004 in the Supabase SQL editor. Safe to re-run.
-- =============================================================================

do $$ begin
  alter publication supabase_realtime add table public.registrations;
exception
  when duplicate_object then null;  -- already added
  when undefined_object then null;  -- no publication (local Postgres without Supabase)
end $$;

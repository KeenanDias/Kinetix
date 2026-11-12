-- =============================================================================
-- Kinetix 0006 — optional note from the player to the host
-- Written on the registration form ("Note for Harsh"), shown in the admin
-- table, the one-tap review page and the host's new-registration email.
-- Run after 0005 in the Supabase SQL editor. Safe to re-run.
-- =============================================================================

alter table public.registrations
  add column if not exists player_note text;

do $$ begin
  alter table public.registrations
    add constraint registrations_player_note_length check (char_length(player_note) <= 500);
exception when duplicate_object then null; end $$;

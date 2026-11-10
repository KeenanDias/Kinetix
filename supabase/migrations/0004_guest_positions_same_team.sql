-- =============================================================================
-- Kinetix 0004 — guest positions and "same team" requests
-- guest_positions[i] is the preferred position of guest_names[i].
-- same_team = the registrant asked for their group to play on one team.
-- Run after 0003 in the Supabase SQL editor. Safe to re-run.
-- =============================================================================

alter table public.registrations
  add column if not exists guest_positions public.player_position[] not null default '{}';

alter table public.registrations
  add column if not exists same_team boolean not null default false;

-- Either no positions (older rows) or exactly one per guest.
do $$ begin
  alter table public.registrations
    add constraint registrations_guest_positions_match
    check (cardinality(guest_positions) in (0, cardinality(guest_names)));
exception when duplicate_object then null; end $$;

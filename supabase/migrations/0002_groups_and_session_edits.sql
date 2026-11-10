-- =============================================================================
-- Kinetix 0002 — group registrations ("pay for friends")
-- One person registers and pays for themselves + up to 5 named guests.
-- Capacity is counted in players, so a group of 3 uses 3 spots.
-- Run after 0001 in the Supabase SQL editor. Safe to re-run.
-- =============================================================================

alter table public.registrations
  add column if not exists guest_names text[] not null default '{}';

do $$ begin
  alter table public.registrations
    add constraint registrations_guest_limit check (cardinality(guest_names) <= 5);
exception when duplicate_object then null; end $$;

-- Total players in this registration (payer + guests). amount_cents is the group total.
alter table public.registrations
  add column if not exists party_size integer
  generated always as (1 + cardinality(guest_names)) stored;

-- filled_spots = players in approved registrations (not number of registrations).
create or replace function public.refresh_filled_spots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  for target in
    select distinct x from unnest(array[
      case when tg_op in ('INSERT', 'UPDATE') then new.session_id end,
      case when tg_op in ('UPDATE', 'DELETE') then old.session_id end
    ]) as x where x is not null
  loop
    update public.sessions s
       set filled_spots = coalesce((select sum(r.party_size) from public.registrations r
                                     where r.session_id = target and r.status = 'approved'), 0)
     where s.id = target;
  end loop;
  return null;
end;
$$;

-- Approval must fit the whole group.
create or replace function public.set_registration_status(
  p_registration_id uuid,
  p_status public.registration_status,
  p_note text default null
)
returns table (previous_status public.registration_status, new_status public.registration_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.registrations;
  s public.sessions;
begin
  if not (public.is_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select * into r from public.registrations where id = p_registration_id;
  if not found then
    raise exception 'REGISTRATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into s from public.sessions where id = r.session_id for update;
  select * into r from public.registrations where id = p_registration_id for update;

  if r.status = p_status then
    return query select r.status, p_status;
    return;
  end if;

  if p_status = 'approved' and s.filled_spots + r.party_size > s.max_players then
    raise exception 'SESSION_FULL' using errcode = 'P0001';
  end if;

  update public.registrations
     set status      = p_status,
         admin_note  = coalesce(nullif(trim(p_note), ''), admin_note),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = r.id;

  return query select r.status, p_status;
end;
$$;

revoke all on function public.set_registration_status(uuid, public.registration_status, text) from public, anon;
grant execute on function public.set_registration_status(uuid, public.registration_status, text) to authenticated, service_role;

-- Recount existing sessions with the new rule.
update public.sessions s
   set filled_spots = coalesce((select sum(r.party_size) from public.registrations r
                                 where r.session_id = s.id and r.status = 'approved'), 0);

-- =============================================================================
-- Kinetix Volleyball Drop-ins — initial schema
-- Run in Supabase SQL editor, or `supabase db push`.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.registration_status as enum ('pending', 'approved', 'waitlist', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.skill_level as enum ('beginner', 'intermediate', 'intermediate_plus', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.player_position as enum ('setter', 'outside', 'opposite', 'middle', 'libero', 'any');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Admins: anyone listed here can use /admin. Add rows after creating the user
-- in Supabase Auth (Authentication -> Users -> Add user).
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- Sessions (drop-in games)
-- -----------------------------------------------------------------------------
create table if not exists public.sessions (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,                 -- e.g. KX1107-A3F, used in e-Transfer note
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  venue_name       text not null,
  venue_address    text not null,
  court            text,                                 -- private: revealed in approval email
  arrival_info     text,                                 -- private: door code, entrance, parking
  skill_level      public.skill_level not null default 'intermediate',
  price_cents      integer not null check (price_cents >= 0),
  max_players      integer not null check (max_players > 0),
  filled_spots     integer not null default 0,           -- maintained by trigger (approved count)
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint sessions_time_order check (ends_at > starts_at)
);

create index if not exists sessions_starts_at_idx on public.sessions (starts_at);

-- Auto-generate a short, human-friendly session code if one isn't supplied.
create or replace function public.sessions_set_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := 'KX' || to_char(new.starts_at at time zone 'America/Toronto', 'MMDD')
                || '-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 3));
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_set_code on public.sessions;
create trigger sessions_set_code
  before insert on public.sessions
  for each row execute function public.sessions_set_code();

-- -----------------------------------------------------------------------------
-- Registrations
-- -----------------------------------------------------------------------------
create table if not exists public.registrations (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.sessions (id) on delete cascade,
  full_name         text not null check (char_length(full_name) between 2 and 120),
  email             text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone             text not null check (char_length(phone) between 7 and 30),
  skill_level       public.skill_level not null,
  position          public.player_position not null default 'any',
  waiver_accepted   boolean not null check (waiver_accepted),
  sender_name       text not null check (char_length(sender_name) between 2 and 120),
  amount_cents      integer not null check (amount_cents >= 0),  -- price at time of registration
  receipt_path      text not null,                                -- object key in `receipts` bucket
  status            public.registration_status not null default 'pending',
  admin_note        text,
  reviewed_at       timestamptz,
  reviewed_by       uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists registrations_session_status_idx
  on public.registrations (session_id, status, created_at);

-- One active application per email per session (rejected players may re-apply).
create unique index if not exists registrations_one_active_per_email
  on public.registrations (session_id, lower(email))
  where status <> 'rejected';

-- Keep sessions.filled_spots equal to the number of approved registrations.
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
       set filled_spots = (select count(*) from public.registrations r
                            where r.session_id = target and r.status = 'approved')
     where s.id = target;
  end loop;
  return null;
end;
$$;

drop trigger if exists registrations_refresh_filled on public.registrations;
create trigger registrations_refresh_filled
  after insert or update of status, session_id or delete on public.registrations
  for each row execute function public.refresh_filled_spots();

-- -----------------------------------------------------------------------------
-- Status changes go through this function so capacity is checked under a lock
-- (two hosts approving the last spot at the same time can't overfill a game).
-- Callable by admins (via their login) or the service role (one-tap email link).
-- -----------------------------------------------------------------------------
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

  -- Lock the session row first, then the registration, to serialize approvals per session.
  select * into s from public.sessions where id = r.session_id for update;
  select * into r from public.registrations where id = p_registration_id for update;

  if r.status = p_status then
    return query select r.status, p_status;  -- idempotent: nothing changes, no email re-sent
    return;
  end if;

  if p_status = 'approved' and s.filled_spots >= s.max_players then
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

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.admins        enable row level security;
alter table public.sessions      enable row level security;
alter table public.registrations enable row level security;

-- admins: an admin can see the admin list; nobody can edit it via the API.
drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins" on public.admins
  for select to authenticated using (public.is_admin());

-- sessions: public can read published sessions; admins can do everything.
drop policy if exists "public read published sessions" on public.sessions;
create policy "public read published sessions" on public.sessions
  for select to anon, authenticated using (is_published or public.is_admin());

drop policy if exists "admins manage sessions" on public.sessions;
create policy "admins manage sessions" on public.sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Explicit grants (newer Supabase projects don't auto-grant new tables to the API roles).
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.sessions, public.registrations to authenticated;
grant all on public.admins, public.sessions, public.registrations to service_role;

-- Hide private columns (court, arrival_info) from anonymous visitors.
revoke select on public.sessions from anon;
grant select (id, code, starts_at, ends_at, venue_name, venue_address, skill_level,
              price_cents, max_players, filled_spots, is_published, created_at)
  on public.sessions to anon;

-- registrations: no public access at all. Players submit through a server action
-- that uses the service role; admins read/update through RLS.
drop policy if exists "admins read registrations" on public.registrations;
create policy "admins read registrations" on public.registrations
  for select to authenticated using (public.is_admin());

drop policy if exists "admins update registrations" on public.registrations;
create policy "admins update registrations" on public.registrations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete registrations" on public.registrations;
create policy "admins delete registrations" on public.registrations
  for delete to authenticated using (public.is_admin());

revoke all on public.registrations from anon;

-- -----------------------------------------------------------------------------
-- Storage: private `receipts` bucket (5 MB images only)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Uploads happen server-side with the service role (bypasses RLS).
-- Admins may view and delete receipts; nobody else can touch them.
drop policy if exists "admins read receipts" on storage.objects;
create policy "admins read receipts" on storage.objects
  for select to authenticated using (bucket_id = 'receipts' and public.is_admin());

drop policy if exists "admins delete receipts" on storage.objects;
create policy "admins delete receipts" on storage.objects
  for delete to authenticated using (bucket_id = 'receipts' and public.is_admin());

-- -----------------------------------------------------------------------------
-- After running: create your admin user in Authentication -> Users, then:
--   insert into public.admins (user_id, email)
--   select id, email from auth.users where email = 'harsh@example.com';
-- Also: Authentication -> Providers -> Email -> turn OFF "Allow new users to sign up".
-- -----------------------------------------------------------------------------

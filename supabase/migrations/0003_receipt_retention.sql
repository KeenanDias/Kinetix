-- =============================================================================
-- Kinetix 0003 — data retention (see /privacy)
-- The daily cleanup job (/api/cron/cleanup) deletes payment screenshots
-- 30 days after a session ends, and deletes sessions + registrations
-- 12 months after they end. This column records when a screenshot was removed.
-- Run after 0002 in the Supabase SQL editor. Safe to re-run.
-- =============================================================================

alter table public.registrations
  add column if not exists receipt_deleted_at timestamptz;

create index if not exists registrations_receipt_pending_cleanup_idx
  on public.registrations (session_id)
  where receipt_deleted_at is null;

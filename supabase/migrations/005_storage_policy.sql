-- ============================================================
-- MOSAIC — Sprint 2: Storage RLS Policies for submissions bucket
-- ============================================================
-- The 'submissions' storage bucket was created in Sprint 1.
-- This migration adds RLS policies so:
--   • Collectors (authenticated) can INSERT (upload) objects
--   • All authenticated users can SELECT (read) objects
-- storage.objects RLS is managed separately from public.* tables.
-- ============================================================

-- Collectors can upload to the submissions bucket
create policy "submissions_bucket_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'submissions');

-- All authenticated users can read from the submissions bucket
create policy "submissions_bucket_select"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'submissions');

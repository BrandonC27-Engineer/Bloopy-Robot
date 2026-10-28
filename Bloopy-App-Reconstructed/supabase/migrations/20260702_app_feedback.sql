-- ============================================================
-- Bloopy in-app feedback ("Rate Bloopy" in Settings)
--
-- Run this in the Supabase SQL editor (or via supabase db push).
-- Users can INSERT their own feedback and SELECT only their own;
-- nobody can browse anyone else's private feedback from the app.
-- Validation (rating range, length caps) is enforced by CHECK
-- constraints server-side, so a tampered client can't bypass it.
-- ============================================================

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  category text check (
    category is null
    or category in ('design', 'usefulness', 'bugs', 'companion', 'confusing', 'other')
  ),
  message text check (message is null or char_length(message) <= 500),
  route text check (route is null or char_length(route) <= 100),
  created_at timestamptz not null default now()
);

alter table public.app_feedback enable row level security;

-- Signed-in users may add feedback, but only as themselves.
create policy "Users can insert their own feedback"
  on public.app_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can read back only their own feedback (e.g. to see what they sent).
create policy "Users can read their own feedback"
  on public.app_feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No UPDATE/DELETE policies on purpose: feedback is submit-only from the app.
-- Review submissions with the service role (Supabase dashboard / SQL editor):
--   select rating, category, message, route, created_at
--   from public.app_feedback
--   order by created_at desc;

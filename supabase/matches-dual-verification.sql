-- Dual-player auto verification. Run once in Supabase SQL editor.

alter table public.matches drop constraint if exists matches_status_check;

alter table public.matches add column if not exists p1_home_score integer;
alter table public.matches add column if not exists p1_away_score integer;
alter table public.matches add column if not exists p2_home_score integer;
alter table public.matches add column if not exists p2_away_score integer;
alter table public.matches add column if not exists submitted_by_p1 text;
alter table public.matches add column if not exists submitted_by_p2 text;
alter table public.matches add column if not exists verified_at timestamptz;

-- Backfill player 1 slots from legacy columns
update public.matches
set
  p1_home_score = coalesce(p1_home_score, home_score),
  p1_away_score = coalesce(p1_away_score, away_score),
  submitted_by_p1 = coalesce(submitted_by_p1, submitted_by)
where p1_home_score is null and home_score is not null;

alter table public.matches alter column home_score drop not null;
alter table public.matches alter column away_score drop not null;

alter table public.matches add constraint matches_p1_home_nonneg
  check (p1_home_score is null or p1_home_score >= 0);
alter table public.matches add constraint matches_p1_away_nonneg
  check (p1_away_score is null or p1_away_score >= 0);
alter table public.matches add constraint matches_p2_home_nonneg
  check (p2_home_score is null or p2_home_score >= 0);
alter table public.matches add constraint matches_p2_away_nonneg
  check (p2_away_score is null or p2_away_score >= 0);

alter table public.matches add constraint matches_status_check
  check (status in ('pending', 'disputed', 'approved', 'rejected'));

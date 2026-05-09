create extension if not exists "pgcrypto";

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  screenshot_path text not null,
  submitted_by text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_matches_created_at on public.matches(created_at desc);

insert into public.teams (name)
values
  ('Real Madrid'),
  ('Manchester City'),
  ('Barcelona'),
  ('Bayern Munich'),
  ('Liverpool'),
  ('PSG')
on conflict (name) do nothing;

insert into storage.buckets (id, name, public)
values ('match-screenshots', 'match-screenshots', true)
on conflict (id) do nothing;

-- Public read for league table (optional if all reads use service role on the server)
alter table public.teams enable row level security;
alter table public.matches enable row level security;

drop policy if exists "Public read teams" on public.teams;
create policy "Public read teams"
  on public.teams for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read approved matches" on public.matches;
create policy "Public read approved matches"
  on public.matches for select
  to anon, authenticated
  using (status = 'approved');

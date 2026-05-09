-- Links Clerk users to app roles. `id` is the Clerk user id (text), not a UUID.
-- Grant yourself admin:
-- insert into public.profiles (id, role) values ('user_xxx_from_clerk', 'admin')
-- on conflict (id) do update set role = excluded.role;

create table if not exists public.profiles (
  id text primary key,
  role text not null default 'user' check (role in ('user', 'admin')),
  email text,
  tournament_team text,
  platform text,
  gamer_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);

alter table public.profiles enable row level security;

-- Lets the browser (anon key) read roles for the nav. Rows are keyed by Clerk id (opaque string).
-- For stricter setups, remove this and use a server API instead.
drop policy if exists "Allow public read profiles" on public.profiles;
create policy "Allow public read profiles"
  on public.profiles for select
  to anon, authenticated
  using (true);

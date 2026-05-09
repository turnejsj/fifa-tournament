-- Links Clerk users to app roles. Set yourself as admin after first sign-in:
-- insert into public.profiles (user_id, role) values ('user_xxx_from_clerk', 'admin')
-- on conflict (user_id) do update set role = excluded.role;

create table if not exists public.profiles (
  user_id text primary key,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);

alter table public.profiles enable row level security;

-- No anon/authenticated policies: app uses service role for reads/writes from Next.js.

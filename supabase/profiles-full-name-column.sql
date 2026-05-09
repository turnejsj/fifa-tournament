alter table public.profiles add column if not exists full_name text;

comment on column public.profiles.full_name is 'Display name; synced from Clerk first name on profile save';

-- Allow `player` role (replaces legacy `user`). Run once in Supabase SQL editor.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('player', 'admin'));
update public.profiles set role = 'player' where role = 'user';
alter table public.profiles alter column role set default 'player';

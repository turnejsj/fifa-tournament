-- Run once if you created `profiles` with column `user_id` instead of `id`.
alter table public.profiles rename column user_id to id;

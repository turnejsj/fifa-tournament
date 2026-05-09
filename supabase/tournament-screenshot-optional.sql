-- Run on existing databases that still require screenshot_path.
alter table public.matches alter column screenshot_path drop not null;

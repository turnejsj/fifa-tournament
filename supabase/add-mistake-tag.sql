alter table public.trades
add column if not exists mistake_tag text default 'None';

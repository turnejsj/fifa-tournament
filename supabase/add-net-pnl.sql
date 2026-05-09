alter table public.trades
add column if not exists net_pnl numeric;

update public.trades
set net_pnl = coalesce(net_pnl, 0);

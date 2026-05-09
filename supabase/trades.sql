create extension if not exists pgcrypto;

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  trade_date text not null,
  symbol text not null,
  side text not null check (side in ('Long', 'Short')),
  quantity numeric not null check (quantity > 0),
  entry_price numeric not null,
  exit_price numeric not null,
  pnl numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists trades_trade_date_idx on public.trades (trade_date);
create index if not exists trades_symbol_idx on public.trades (symbol);

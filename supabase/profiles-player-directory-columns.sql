-- Player directory fields (run once on existing projects).
alter table public.profiles add column if not exists tournament_team text;
alter table public.profiles add column if not exists platform text;
alter table public.profiles add column if not exists gamer_tag text;

comment on column public.profiles.tournament_team is 'Tournament / in-game club or nation the player represents';
comment on column public.profiles.platform is 'PSN, Xbox, or EA (EA App / cross-play)';
comment on column public.profiles.gamer_tag is 'Gamertag / PSN ID / EA ID for friend invites';

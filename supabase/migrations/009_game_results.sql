-- Game results for party games (Hot Take, Like Minded, Quiz, etc.)
create table games.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null,
  played_at timestamptz not null default now(),
  players_count integer,
  won boolean,
  was_host boolean default false
);

create index game_results_user_id_idx on games.game_results(user_id);
create index game_results_played_at_idx on games.game_results(played_at desc);

-- Tracker results for card games (Septica, Whist, Rentz, General)
create table games.tracker_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tracker_type text not null,
  played_at timestamptz not null default now(),
  players jsonb not null,
  scores jsonb not null,
  winner_index integer
);

create index tracker_results_user_id_idx on games.tracker_results(user_id);
create index tracker_results_played_at_idx on games.tracker_results(played_at desc);

-- Enable RLS
alter table games.game_results enable row level security;
alter table games.tracker_results enable row level security;

-- Users can only see/insert their own results
create policy "Users can view own game results"
  on games.game_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own game results"
  on games.game_results for insert
  with check (auth.uid() = user_id);

create policy "Users can view own tracker results"
  on games.tracker_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own tracker results"
  on games.tracker_results for insert
  with check (auth.uid() = user_id);

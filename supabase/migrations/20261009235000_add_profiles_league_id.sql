-- Per-user Sleeper league id. Null falls back to the server LEAGUE_ID env var.
-- Digits only, 1-20 characters (Sleeper league ids are numeric).
alter table public.profiles
  add column league_id text
  check (league_id is null or league_id ~ '^[0-9]{1,20}$');

-- Column-level grant, same idea as display_name. id, sleeper_user_id, and
-- the timestamps stay out of reach of the client.
grant update (league_id) on table public.profiles to authenticated;

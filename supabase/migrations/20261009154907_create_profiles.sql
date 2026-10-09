-- One profile per auth user. Holds app-level data that auth.users should not.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 50),
  -- Links an account to a Sleeper league member. Set by an admin, never by the user.
  sleeper_user_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Privileges: signed-in users may read profiles and change only display_name.
-- The column-level grant keeps id, sleeper_user_id and the timestamps
-- out of reach of the client, even though the update policy matches the row.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- RLS policies. No insert/delete policies: rows are created by the
-- on_auth_user_created trigger and removed by the cascade from auth.users.
create policy "Signed-in users can read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Keeps updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Creates a profile whenever a new auth user signs up.
-- security definer so it can insert despite RLS and the revoked privileges.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 50), ''));
  return new;
end;
$$;

-- Only the trigger should run this function, never API callers.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

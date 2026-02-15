-- ======================================================
--  TABLE : public.profiles
--  Purpose: Store user metadata (public profile)
--  Secured with Row Level Security
-- ======================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Drop old policies if they exist
drop policy if exists "Profiles: Select own" on public.profiles;
drop policy if exists "Profiles: Update own" on public.profiles;

-- Policy: Read own profile only
create policy "Profiles: Select own"
on public.profiles
for select
using (auth.uid() = id);

-- Policy: Update only by owner
create policy "Profiles: Update own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Auto-insert profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
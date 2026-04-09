-- Supabase RLS fix for auth + multiplayer tables
-- Run this in Supabase SQL Editor

begin;

-- Ensure schema/table grants (safe defaults for Supabase API roles)
grant usage on schema public to anon, authenticated;
grant select on public.players to anon, authenticated;
grant select on public.rooms to anon, authenticated;
grant select on public.room_players to anon, authenticated;
grant insert, update, delete on public.players to authenticated;
grant insert, update, delete on public.rooms to authenticated;
grant insert, update, delete on public.room_players to authenticated;

-- Enable RLS
alter table public.players enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- Drop old policies to avoid conflicts
drop policy if exists "Users can view all players" on public.players;
drop policy if exists "Users can update their own profile" on public.players;
drop policy if exists "Auth users can insert their profile" on public.players;
drop policy if exists "users_select_players" on public.players;
drop policy if exists "users_insert_players" on public.players;
drop policy if exists "users_update_players" on public.players;
drop policy if exists "users_delete_players" on public.players;

drop policy if exists "Users can view all rooms" on public.rooms;
drop policy if exists "Authenticated users can create rooms" on public.rooms;
drop policy if exists "Users can update their own rooms" on public.rooms;
drop policy if exists "Users can delete their own rooms" on public.rooms;
drop policy if exists "users_select_rooms" on public.rooms;
drop policy if exists "users_insert_rooms" on public.rooms;
drop policy if exists "users_update_rooms" on public.rooms;
drop policy if exists "users_delete_rooms" on public.rooms;

drop policy if exists "Users can view room players" on public.room_players;
drop policy if exists "Users can join rooms" on public.room_players;
drop policy if exists "Users can leave rooms" on public.room_players;
drop policy if exists "users_select_room_players" on public.room_players;
drop policy if exists "users_insert_room_players" on public.room_players;
drop policy if exists "users_delete_room_players" on public.room_players;

-- players policies
create policy "users_select_players"
on public.players
for select
using (true);

create policy "users_insert_players"
on public.players
for insert
to authenticated
with check (
  auth.uid() = id
  or auth.role() = 'service_role'
);

create policy "users_update_players"
on public.players
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users_delete_players"
on public.players
for delete
to authenticated
using (auth.uid() = id or auth.role() = 'service_role');

-- rooms policies
create policy "users_select_rooms"
on public.rooms
for select
using (true);

create policy "users_insert_rooms"
on public.rooms
for insert
to authenticated
with check (
  auth.uid() is not null
  and created_by = auth.uid()
);

create policy "users_update_rooms"
on public.rooms
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "users_delete_rooms"
on public.rooms
for delete
to authenticated
using (created_by = auth.uid());

-- room_players policies
create policy "users_select_room_players"
on public.room_players
for select
using (true);

create policy "users_insert_room_players"
on public.room_players
for insert
to authenticated
with check (auth.uid() = player_id);

create policy "users_delete_room_players"
on public.room_players
for delete
to authenticated
using (
  auth.uid() = player_id
  or exists (
    select 1
    from public.rooms r
    where r.id = room_players.room_id
      and r.created_by = auth.uid()
  )
);

-- Optional trigger refresh (keeps signup profile bootstrap)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (id, nickname, level, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', split_part(new.email, '@', 1)),
    1,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

commit;

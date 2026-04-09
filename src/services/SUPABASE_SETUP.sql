/**
 * SUPABASE DATABASE SETUP SQL
 * 
 * Run this SQL in your Supabase SQL editor to set up the database structure
 * Path: https://app.supabase.com => Project => SQL Editor => New Query
 * 
 * This creates:
 * 1. players table - User profiles linked to auth.users
 * 2. rooms table - Multiplayer game rooms
 * 3. room_players table - Junction table for room membership (many-to-many)
 */

-- ============================================================================
-- 1. Create PLAYERS table
-- ============================================================================
-- Stores player profiles linked to authentication users
-- id is a foreign key to auth.users(id) - automatically added by Supabase Auth

create table if not exists public.players (
  id uuid not null primary key references auth.users(id) on delete cascade,
  nickname text not null,
  level integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone,
  
  constraint players_nickname_length check (char_length(nickname) >= 1 and char_length(nickname) <= 50)
);

-- Add RLS (Row Level Security) to players table
alter table public.players enable row level security;

-- RLS Policy: Users can read all players (public leaderboard)
create policy "Users can view all players" on public.players
  for select using (true);

-- RLS Policy: Users can only update their own profile
create policy "Users can update their own profile" on public.players
  for update using (auth.uid() = id);

-- RLS Policy: Auth trigger creates player profile (handled by trigger below)
create policy "Auth users can insert their profile" on public.players
  for insert with check (auth.uid() = id);

-- ============================================================================
-- 2. Create ROOMS table
-- ============================================================================
-- Stores multiplayer game room information

create table if not exists public.rooms (
  id uuid not null primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.players(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone,
  
  constraint rooms_name_length check (char_length(name) >= 1 and char_length(name) <= 100)
);

-- Add RLS to rooms table
alter table public.rooms enable row level security;

-- RLS Policy: Everyone can view all rooms
create policy "Users can view all rooms" on public.rooms
  for select using (true);

-- RLS Policy: Authenticated users can create rooms
create policy "Authenticated users can create rooms" on public.rooms
  for insert with check (auth.role() = 'authenticated');

-- RLS Policy: Only room creator can update their room
create policy "Users can update their own rooms" on public.rooms
  for update using (auth.uid() = created_by);

-- RLS Policy: Only room creator can delete their room
create policy "Users can delete their own rooms" on public.rooms
  for delete using (auth.uid() = created_by);

-- ============================================================================
-- 3. Create ROOM_PLAYERS junction table
-- ============================================================================
-- Links players to rooms (many-to-many relationship)

create table if not exists public.room_players (
  id uuid not null primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  joined_at timestamp with time zone not null default now(),
  
  -- Ensure a player can't join the same room twice
  unique(room_id, player_id)
);

-- Add RLS to room_players table
alter table public.room_players enable row level security;

-- RLS Policy: Everyone can view room membership
create policy "Users can view room players" on public.room_players
  for select using (true);

-- RLS Policy: Users can only add themselves to a room
create policy "Users can join rooms" on public.room_players
  for insert with check (auth.uid() = player_id);

-- RLS Policy: Users can only remove themselves from a room
create policy "Users can leave rooms" on public.room_players
  for delete using (auth.uid() = player_id);

-- ============================================================================
-- 4. Create INDEXES for performance
-- ============================================================================

-- Index for faster player lookups by nickname
create index if not exists idx_players_nickname on public.players(nickname);

-- Index for faster room queries
create index if not exists idx_rooms_created_at on public.rooms(created_at desc);
create index if not exists idx_rooms_created_by on public.rooms(created_by);

-- Index for faster room_players queries
create index if not exists idx_room_players_room_id on public.room_players(room_id);
create index if not exists idx_room_players_player_id on public.room_players(player_id);
create index if not exists idx_room_players_joined_at on public.room_players(joined_at);

-- ============================================================================
-- 5. Create TRIGGER for automatic player profile creation
-- ============================================================================
-- When a user signs up, automatically create their player profile

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.players (id, nickname, level, created_at)
  values (
    new.id,
    new.email, -- Use email as initial nickname
    1,
    now()
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger to call the function
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 6. Enable Realtime for real-time updates
-- ============================================================================
-- This must be done in Supabase Dashboard:
-- Settings => Realtime => Select tables: players, rooms, room_players
-- Or run these commands if your role has permission:

-- alter publication supabase_realtime add table public.players;
-- alter publication supabase_realtime add table public.rooms;
-- alter publication supabase_realtime add table public.room_players;

-- ============================================================================
-- OPTIONAL: Create some test data
-- ============================================================================
-- Uncomment and run to create test data for development

-- Insert test room
-- insert into public.rooms (name, created_by)
-- values ('Test Battle Room', 'user-id-here')
-- on conflict do nothing;

-- ============================================================================
-- CLEANUP: If you need to reset everything, run:
-- ============================================================================
-- drop trigger on_auth_user_created on auth.users;
-- drop function public.handle_new_user();
-- drop table if exists public.room_players cascade;
-- drop table if exists public.rooms cascade;
-- drop table if exists public.players cascade;

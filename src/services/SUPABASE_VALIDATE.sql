-- Validation queries for Supabase multiplayer schema
-- Run these after executing the setup SQL and doing at least one signup/room join.

-- 1) Confirm tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('players', 'rooms', 'room_players')
order by table_name;

-- 2) Quick row counts
select 'players' as table_name, count(*) as total from public.players
union all
select 'rooms' as table_name, count(*) as total from public.rooms
union all
select 'room_players' as table_name, count(*) as total from public.room_players;

-- 3) Validate players linked to auth.users
select p.id, p.nickname, p.level, p.created_at, u.email
from public.players p
join auth.users u on u.id = p.id
order by p.created_at desc
limit 20;

-- 4) Validate room ownership and membership
select r.id as room_id,
       r.name as room_name,
       r.created_by,
       rp.player_id,
       rp.joined_at
from public.rooms r
left join public.room_players rp on rp.room_id = r.id
order by r.created_at desc, rp.joined_at asc
limit 50;

-- 5) Detect invalid memberships (should return 0 rows)
select rp.*
from public.room_players rp
left join public.rooms r on r.id = rp.room_id
left join public.players p on p.id = rp.player_id
where r.id is null or p.id is null;

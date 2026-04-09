/**
 * SUPABASE INTEGRATION GUIDE
 * 
 * Complete guide for using Supabase in your Pokémon battle game
 */

# 📡 Supabase Integration Complete

## Quick Start

### 1. Setup Environment Variables

Create `.env.local` in your project root:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

You can find these in your [Supabase Dashboard](https://app.supabase.com):
- Settings > API > Project URL
- Settings > API > Anon key (public)

### 2. Setup Supabase Database

1. Go to https://app.supabase.com
2. Create a new project or select existing
3. Go to SQL Editor
4. Create a new query
5. Copy and paste the entire content from `src/services/SUPABASE_SETUP.sql`
6. Click "Run"

This creates:
- `players` table - Player profiles
- `rooms` table - Multiplayer rooms
- `room_players` table - Room membership

### 3. Enable Realtime (Optional but Recommended)

For real-time multiplayer features:

1. Go to Settings > Realtime
2. Click "Enable Realtime" if not already enabled
3. Select the tables: `players`, `rooms`, `room_players`
4. Click "Save"

## 📚 Usage Examples

### Authentication

```typescript
import { useAuth } from '@/services';

export function LoginPage() {
  const { signIn, signUp, user, isLoading, error } = useAuth();

  const handleSignUp = async (email: string, password: string, nickname: string) => {
    const success = await signUp(email, password, nickname);
    if (success) {
      // User is now logged in
      console.log('Welcome,', user?.nickname);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    const success = await signIn(email, password);
    if (success) {
      console.log('Logged in as', user?.email);
    }
  };

  return (
    <div>
      {user ? (
        <p>Logged in as {user.nickname}</p>
      ) : (
        <div>
          {/* Login form */}
        </div>
      )}
    </div>
  );
}
```

### Create & Join Rooms

```typescript
import { roomService } from '@/services';

// Create a room
const response = await roomService.createRoom('Epic Battle', userId);

if (response.success) {
  const room = response.data;
  console.log('Room created:', room.id);
}

// Join a room
const joinResponse = await roomService.joinRoom(roomId, playerId);

// Get all players in room
const players = await roomService.getRoomPlayersWithProfiles(roomId);
console.log('Players in room:', players);
```

### Real-Time Updates

```typescript
import { useRoomPlayersListener } from '@/services';

export function RoomPlayers({ roomId }: { roomId: string }) {
  const { data: players, isConnected } = useRoomPlayersListener(roomId);

  return (
    <div>
      <p>{isConnected ? '🟢 Live' : '🔴 Disconnected'}</p>
      <ul>
        {players.map((player) => (
          <li key={player.player_id}>{player.player_id}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Player Profile Management

```typescript
import { playerService } from '@/services';

// Get player info
const player = await playerService.getPlayer(userId);

// Update level
await playerService.incrementLevel(userId);

// Get leaderboard
const topPlayers = await playerService.getAllPlayers(10);
```

## 🗂️ File Structure

```
src/
├── services/
│   ├── index.ts              # Export all services
│   ├── supabaseClient.ts     # Supabase client initialization
│   ├── authService.ts        # Auth operations
│   ├── playerService.ts      # Player profile operations
│   ├── roomService.ts        # Room/multiplayer operations
│   └── SUPABASE_SETUP.sql    # Database schema
├── hooks/
│   ├── useAuth.ts           # Auth state management hook
│   └── useRealtime.ts       # Real-time subscriptions hook
└── types/
    └── database.ts          # TypeScript types for database
```

## 🔑 Key Functions

### Authentication (authService)
- `signUp(email, password, nickname)` - Register new user
- `signIn(email, password)` - Login user
- `signOut()` - Logout user
- `getCurrentUser()` - Get logged-in user info
- `onAuthStateChange(callback)` - Listen to auth changes

### Player Management (playerService)
- `createPlayer(userId, nickname)` - Create player profile
- `getPlayer(playerId)` - Get player info
- `updatePlayer(playerId, updates)` - Update player data
- `incrementLevel(playerId)` - Increase player level
- `getAllPlayers(limit)` - Get leaderboard

### Rooms (roomService)
- `createRoom(name, createdBy)` - Create multiplayer room
- `getRoom(roomId)` - Get room info
- `getAllRooms(limit)` - List available rooms
- `joinRoom(roomId, playerId)` - Player joins room
- `leaveRoom(roomId, playerId)` - Player leaves room
- `getRoomPlayers(roomId)` - Get room membership
- `getRoomPlayersWithProfiles(roomId)` - Get player details
- `listenRoomPlayers(roomId, callback)` - Real-time room updates
- `deleteRoom(roomId)` - Delete room

### Hooks (React)
- `useAuth()` - Auth state and operations
- `useRealtime(options, callback)` - Generic real-time listener
- `useRoomPlayersListener(roomId)` - Room players real-time

## 🔐 Security

### Row Level Security (RLS) is enabled by default for:
- **players**: Users can read all, update only their own
- **rooms**: All can view, auth users can create, only creator can edit/delete
- **room_players**: All can view, users can only manage their own membership

### Best Practices:
1. ✅ Never expose `SUPABASE_ANON_KEY` in frontend code (Vite env vars are safe)
2. ✅ Use RLS policies to enforce permissions
3. ✅ Validate user input before database operations
4. ✅ Use `.env.local` for development, never commit it
5. ✅ Use proper error handling with try-catch

## 📝 TypeScript Types

All functions are fully typed:

```typescript
import type { 
  User,
  Player,
  Room,
  RoomPlayer,
  AuthResponse 
} from '@/services';

// Use these types in your components for full autocomplete
const user: User = { id: 'xxx', email: 'xxx', nickname: 'xxx', level: 5 };
```

## 🚀 Next Steps for Multiplayer

1. **Implement Battle Queue**: Match players together
2. **Add WebSocket for Turn-Based Combat**: Use Supabase Realtime to sync moves
3. **Pokémon Battle State**: Store battle state in `battle_sessions` table
4. **Chat/Messages**: Add `messages` table for in-game chat
5. **Tournaments**: Create `tournaments` and `tournament_matches` tables
6. **Achievements**: Add `achievements` and `player_achievements` tables

## 🐛 Troubleshooting

### "Missing Supabase credentials" error
- Check `.env.local` exists and has correct URL and key
- Restart dev server: `npm run dev`

### Real-time updates not working
- Verify Realtime is enabled in Supabase settings
- Check that the tables are selected in Realtime
- Ensure RLS policies allow the operations

### Login not working
- Check email/password are correct
- Verify user exists in Supabase auth
- Check browser console for specific error message

### Players not showing in rooms
- Verify `room_players` table has records
- Check RLS policies on `room_players` table
- Use Supabase dashboard to inspect database

## 📖 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)

---

**Happy building! 🎮**

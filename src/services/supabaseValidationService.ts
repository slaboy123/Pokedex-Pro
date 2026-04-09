import { supabase } from './supabaseClient';

export type ValidationResult = {
  ok: boolean;
  message: string;
  details?: unknown;
};

export type SchemaValidation = {
  players: ValidationResult;
  rooms: ValidationResult;
  roomPlayers: ValidationResult;
};

const mapError = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: string }).message || fallback);
  }
  return fallback;
};

export async function validateSchemaReady(): Promise<SchemaValidation> {
  const [playersRes, roomsRes, roomPlayersRes] = await Promise.all([
    supabase.from('players').select('id', { count: 'exact', head: true }),
    supabase.from('rooms').select('id', { count: 'exact', head: true }),
    supabase.from('room_players').select('id', { count: 'exact', head: true }),
  ]);

  return {
    players: playersRes.error
      ? { ok: false, message: mapError(playersRes.error, 'players table unavailable') }
      : { ok: true, message: 'players table ok', details: { count: playersRes.count ?? 0 } },
    rooms: roomsRes.error
      ? { ok: false, message: mapError(roomsRes.error, 'rooms table unavailable') }
      : { ok: true, message: 'rooms table ok', details: { count: roomsRes.count ?? 0 } },
    roomPlayers: roomPlayersRes.error
      ? { ok: false, message: mapError(roomPlayersRes.error, 'room_players table unavailable') }
      : {
          ok: true,
          message: 'room_players table ok',
          details: { count: roomPlayersRes.count ?? 0 },
        },
  };
}

export async function validatePlayerPlacement(userId: string): Promise<ValidationResult> {
  const { data, error } = await supabase.from('players').select('*').eq('id', userId).maybeSingle();
  if (error) {
    return { ok: false, message: mapError(error, 'Failed to read players row') };
  }
  if (!data) {
    return { ok: false, message: 'No row found in players for this userId' };
  }
  return { ok: true, message: 'players row found', details: data };
}

export async function validateRoomPlacement(roomId: string): Promise<ValidationResult> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) {
    return { ok: false, message: mapError(error, 'Failed to read rooms row') };
  }
  if (!data) {
    return { ok: false, message: 'No row found in rooms for this roomId' };
  }
  return { ok: true, message: 'rooms row found', details: data };
}

export async function validateRoomMembership(roomId: string, playerId: string): Promise<ValidationResult> {
  const { data, error } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: mapError(error, 'Failed to read room_players row') };
  }
  if (!data) {
    return { ok: false, message: 'No membership found in room_players for roomId+playerId' };
  }
  return { ok: true, message: 'room_players row found', details: data };
}

/**
 * Supabase Services & Hooks Index
 * Export all Supabase-related functionality from a single entry point
 */

// Services
export { supabase } from './supabaseClient';
export { authService } from './authService';
export { playerService } from './playerService';
export { roomService } from './roomService';
export {
  validateSchemaReady,
  validatePlayerPlacement,
  validateRoomPlacement,
  validateRoomMembership,
} from './supabaseValidationService';

// Hooks
export { useAuth } from '../hooks/useAuth';
export { useRealtime, useRoomPlayersListener } from '../hooks/useRealtime';

// Types
export type { 
  Database,
  User,
  Player,
  PlayerInsert,
  PlayerUpdate,
  Room,
  RoomInsert,
  RoomUpdate,
  RoomPlayer,
  RoomPlayerInsert,
  AuthResponse,
} from '../types/database';

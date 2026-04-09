/**
 * Room Service
 * Handles multiplayer room operations: create, join, listen to real-time room events
 */

import { supabase } from './supabaseClient';
import type { Room, RoomInsert, RoomPlayer, RoomPlayerInsert, AuthResponse } from '@/types/database';

export const roomService = {
  /**
   * Create a new multiplayer room
   * @param name - Room name
   * @param createdBy - User ID of room creator
   * @returns AuthResponse with created room data
   */
  async createRoom(name: string, createdBy: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name,
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Add creator to room
      await this.joinRoom((data as any).id, createdBy);

      return {
        success: true,
        data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error creating room';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Get a room by ID
   * @param roomId - The room ID
   * @returns Room data or null
   */
  async getRoom(roomId: string): Promise<Room | null> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) {
        console.error('Error fetching room:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting room:', error);
      return null;
    }
  },

  /**
   * Get all available rooms
   * @param limit - Maximum number of rooms to fetch
   * @returns Array of rooms
   */
  async getAllRooms(limit: number = 50): Promise<Room[]> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching rooms:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting all rooms:', error);
      return [];
    }
  },

  /**
   * Join a room
   * @param roomId - The room ID
   * @param playerId - The player's user ID
   * @returns AuthResponse
   */
  async joinRoom(roomId: string, playerId: string): Promise<AuthResponse> {
    try {
      // Check if already in room
      const { data: existing } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('player_id', playerId)
        .single();

      if (existing) {
        return {
          success: true,
          data: { message: 'Already in room' },
        };
      }

      // Add player to room
      const { data, error } = await supabase
        .from('room_players')
        .insert({
          room_id: roomId,
          player_id: playerId,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error joining room';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Leave a room
   * @param roomId - The room ID
   * @param playerId - The player's user ID
   * @returns AuthResponse
   */
  async leaveRoom(roomId: string, playerId: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('player_id', playerId);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error leaving room';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Get all players in a room
   * @param roomId - The room ID
   * @returns Array of room players with their profiles
   */
  async getRoomPlayers(
    roomId: string
  ): Promise<Array<{ id: string; player_id: string; room_id: string; joined_at: string }> | null> {
    try {
      const { data, error } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching room players:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting room players:', error);
      return null;
    }
  },

  /**
   * Get details of players in a room (with player info)
   * @param roomId - The room ID
   * @returns Array of players in room with full profile info
   */
  async getRoomPlayersWithProfiles(
    roomId: string
  ): Promise<
    Array<{
      id: string;
      room_id: string;
      player_id: string;
      joined_at: string;
      players: { id: string; nickname: string; level: number } | null;
    }> | null
  > {
    try {
      const { data, error } = await supabase
        .from('room_players')
        .select(
          `
          id,
          room_id,
          player_id,
          joined_at,
          players (id, nickname, level)
        `
        )
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching room players with profiles:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting room players with profiles:', error);
      return null;
    }
  },

  /**
   * Delete a room
   * @param roomId - The room ID
   * @returns AuthResponse
   */
  async deleteRoom(roomId: string): Promise<AuthResponse> {
    try {
      // First, remove all players from room
      await supabase.from('room_players').delete().eq('room_id', roomId);

      // Then delete the room
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error deleting room';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Listen for real-time changes in a specific room's players
   * @param roomId - The room ID to listen to
   * @param callback - Function to call when room players change
   * @returns Unsubscribe function
   */
  listenRoomPlayers(
    roomId: string,
    callback: (data: RoomPlayer[]) => void
  ): (() => void) | undefined {
    const channel = supabase
      .channel(`room_${roomId}:room_players`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          // Fetch updated players
          const players = await this.getRoomPlayers(roomId);
          if (players) {
            callback(players);
          }
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  },

  /**
   * Listen for real-time changes in room players with their profiles
   * @param roomId - The room ID to listen to
   * @param callback - Function to call when room players change
   * @returns Unsubscribe function
   */
  listenRoomPlayersWithProfiles(
    roomId: string,
    callback: (data: any[]) => void
  ): (() => void) | undefined {
    const channel = supabase
      .channel(`room_${roomId}:room_players_profiles`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          // Fetch updated players with profiles
          const players = await this.getRoomPlayersWithProfiles(roomId);
          if (players) {
            callback(players);
          }
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  },
};

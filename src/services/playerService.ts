/**
 * Player Service
 * Handles player profile operations: create, read, update profiles
 */

import { supabase } from './supabaseClient';
import type { Player, PlayerInsert, PlayerUpdate, AuthResponse } from '@/types/database';

export const playerService = {
  /**
   * Create a new player profile
   * @param userId - The user ID from auth
   * @param nickname - Player's nickname
   * @returns AuthResponse with created player data
   */
  async createPlayer(userId: string, nickname: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase
        .from('players')
        .insert({
          id: userId,
          nickname,
          level: 1,
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
      const message = error instanceof Error ? error.message : 'Error creating player';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Get player profile by ID
   * @param playerId - The player's user ID
   * @returns Player data or null
   */
  async getPlayer(playerId: string): Promise<Player | null> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (error) {
        console.error('Error fetching player:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting player:', error);
      return null;
    }
  },

  /**
   * Update player profile
   * @param playerId - The player's user ID
   * @param updates - Fields to update
   * @returns AuthResponse with updated player data
   */
  async updatePlayer(playerId: string, updates: PlayerUpdate): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase
        .from('players')
        .update(updates as any)
        .eq('id', playerId)
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
      const message = error instanceof Error ? error.message : 'Error updating player';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Increment player level
   * @param playerId - The player's user ID
   * @returns AuthResponse with updated player data
   */
  async incrementLevel(playerId: string): Promise<AuthResponse> {
    try {
      const player = await this.getPlayer(playerId);
      if (!player) {
        return {
          success: false,
          error: 'Player not found',
        };
      }

      const { data, error } = await supabase
        .from('players')
        .update({ level: (player.level || 1) + 1 })
        .eq('id', playerId)
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
      const message = error instanceof Error ? error.message : 'Error incrementing level';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Get all players (for leaderboard, etc.)
   * @param limit - Maximum number of players to fetch
   * @returns Array of players
   */
  async getAllPlayers(limit: number = 100): Promise<Player[]> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('level', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching players:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting all players:', error);
      return [];
    }
  },

  /**
   * Delete player profile
   * @param playerId - The player's user ID
   * @returns AuthResponse
   */
  async deletePlayer(playerId: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error deleting player';
      return {
        success: false,
        error: message,
      };
    }
  },
};

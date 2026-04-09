/**
 * Database types for Supabase
 * This file contains all TypeScript types for database tables and operations
 */

export type Database = {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          nickname: string | null;
          level: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          nickname?: string | null;
          level?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          nickname?: string | null;
          level?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          created_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      room_players: {
        Row: {
          id: string;
          room_id: string;
          player_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          player_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          player_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Helper types for application logic
 */
export type User = {
  id: string;
  email?: string;
  nickname?: string;
  level: number;
};

export type Player = Database['public']['Tables']['players']['Row'];
export type PlayerInsert = Database['public']['Tables']['players']['Insert'];
export type PlayerUpdate = Database['public']['Tables']['players']['Update'];

export type Room = Database['public']['Tables']['rooms']['Row'];
export type RoomInsert = Database['public']['Tables']['rooms']['Insert'];
export type RoomUpdate = Database['public']['Tables']['rooms']['Update'];

export type RoomPlayer = Database['public']['Tables']['room_players']['Row'];
export type RoomPlayerInsert = Database['public']['Tables']['room_players']['Insert'];

export type AuthResponse = {
  success: boolean;
  error?: string;
  data?: unknown;
};

/**
 * Authentication Service
 * Handles user authentication operations: signup, signin, logout, and user retrieval
 */

import { supabase } from './supabaseClient';
import type { AuthResponse, User } from '@/types/database';

export const authService = {
  /**
   * Sign up a new user
   * @param email - User email
   * @param password - User password
   * @param nickname - User nickname for the game
   * @returns AuthResponse with success status
   */
  async signUp(email: string, password: string, nickname: string): Promise<AuthResponse> {
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError || !authData.user) {
        return {
          success: false,
          error: signUpError?.message || 'Failed to create user',
        };
      }

      const { error: profileError } = await supabase.from('players').upsert(
        {
          id: authData.user.id,
          nickname,
          level: 1,
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        return {
          success: false,
          error: profileError.message,
        };
      }

      return {
        success: true,
        data: { userId: authData.user.id, email },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during signup';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Sign in an existing user
   * @param email - User email
   * @param password - User password
   * @returns AuthResponse with success status and user data
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return {
          success: false,
          error: error?.message || 'Failed to sign in',
        };
      }

      return {
        success: true,
        data: {
          userId: data.user.id,
          email: data.user.email,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during signin';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Sign out the current user
   * @returns AuthResponse with success status
   */
  async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during signout';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Get the current authenticated user
   * @returns User data or null if not authenticated
   */
  async getCurrentUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (playerError) {
        return {
          id: user.id,
          email: user.email,
          nickname: user.email?.split('@')[0],
          level: 1,
        } satisfies User;
      }

      return {
        id: user.id,
        email: user.email,
        nickname: player?.nickname || user.email?.split('@')[0],
        level: player?.level || 1,
      } satisfies User;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  /**
   * Listen to auth state changes (for real-time updates)
   * @param callback - Function to call when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(
    callback: (user: { id: string; email: string } | null) => void
  ): (() => void) | undefined {
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
        });
      } else {
        callback(null);
      }
    });

    return data?.subscription?.unsubscribe;
  },

  /**
   * Send password recovery email
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error sending recovery email';
      return {
        success: false,
        error: message,
      };
    }
  },

  /**
   * Update current user password
   */
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error updating password';
      return {
        success: false,
        error: message,
      };
    }
  },
};

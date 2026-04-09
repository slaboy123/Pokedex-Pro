/**
 * useAuth Hook
 * Manages authentication state and operations in React components
 */

import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import type { User } from '@/types/database';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signUp: (email: string, password: string, nickname: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError(err instanceof Error ? err.message : 'Error checking authentication');
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth();

    // Listen to auth state changes
    const unsubscribe = authService.onAuthStateChange((authUser) => {
      if (authUser) {
        // User is logged in, fetch full profile
        authService.getCurrentUser().then(setUser);
      } else {
        setUser(null);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signUp = async (email: string, password: string, nickname: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.signUp(email, password, nickname);

      if (!response.success) {
        setError(response.error || 'Failed to sign up');
        return false;
      }

      // Get updated user data
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during signup';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.signIn(email, password);

      if (!response.success) {
        setError(response.error || 'Failed to sign in');
        return false;
      }

      // Get updated user data
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during signin';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.signOut();

      if (!response.success) {
        setError(response.error || 'Failed to sign out');
        return false;
      }

      setUser(null);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during signout';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.resetPassword(email);

      if (!response.success) {
        setError(response.error || 'Failed to send password recovery email');
        return false;
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during password recovery';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
};

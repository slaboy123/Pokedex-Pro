/**
 * useRealtime Hook
 * Manages real-time subscriptions to Supabase database changes
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
}

interface UseRealtimeReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

/**
 * Generic hook for real-time data subscription
 * @param options - Configuration for the real-time listener
 * @param callback - Optional callback when data changes
 * @returns Object with data, loading state, and error
 */
export const useRealtime = <T,>(
  options: UseRealtimeOptions,
  callback?: (data: T[]) => void
): UseRealtimeReturn<T> => {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const subscribe = async (): Promise<void> => {
      try {
        const newChannel = supabase
          .channel(`${options.table}:changes`, {
            config: {
              broadcast: { ack: true },
            },
          })
          .on(
            'postgres_changes',
            {
              event: options.event || '*',
              schema: options.schema || 'public',
              table: options.table,
              filter: options.filter,
            },
            (payload) => {
              // Handle real-time updates
              if (payload.eventType === 'INSERT') {
                setData((prev) => [...prev, payload.new as T]);
              } else if (payload.eventType === 'UPDATE') {
                setData((prev) =>
                  prev.map((item: any) =>
                    item.id === (payload.new as any).id ? (payload.new as T) : item
                  )
                );
              } else if (payload.eventType === 'DELETE') {
                setData((prev) => prev.filter((item: any) => item.id !== (payload.old as any).id));
              }

              // Call optional callback
              if (callback) {
                callback(data);
              }
            }
          )
          .subscribe((status) => {
            setIsConnected(status === 'SUBSCRIBED');
            if (status === 'SUBSCRIBED') {
              setIsLoading(false);
            }
          });

        setChannel(newChannel);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error subscribing to real-time';
        setError(message);
        setIsLoading(false);
      }
    };

    void subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [options.table, options.event, options.schema, options.filter]);

  return {
    data,
    isLoading,
    error,
    isConnected,
  };
};

/**
 * Hook for listening to room players changes
 * @param roomId - The room ID to listen to
 * @returns Object with room players data and connection status
 */
export const useRoomPlayersListener = (
  roomId: string | null
): UseRealtimeReturn<{ id: string; player_id: string; room_id: string; joined_at: string }> => {
  return useRealtime(
    {
      table: 'room_players',
      filter: roomId ? `room_id=eq.${roomId}` : undefined,
    },
    undefined
  );
};

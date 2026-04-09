/**
 * Example: Multiplayer Rooms Component
 * Demonstrates room creation, listing, and real-time updates
 */

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { roomService } from '@/services';
import type { Room } from '@/services';

interface MultiplayerRoomsProps {
  userId: string;
}

export const MultiplayerRooms = ({ userId }: MultiplayerRoomsProps): JSX.Element => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<string[]>([]);

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, []);

  // Listen for room changes
  useEffect(() => {
    if (!selectedRoom) return;

    const unsubscribe = roomService.listenRoomPlayers(selectedRoom, (players) => {
      setRoomPlayers(players.map((p) => p.player_id));
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedRoom]);

  const loadRooms = async (): Promise<void> => {
    try {
      setLoading(true);
      const allRooms = await roomService.getAllRooms();
      setRooms(allRooms);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      setCreating(true);
      const response = await roomService.createRoom(newRoomName, userId);

      if (response.success) {
        setNewRoomName('');
        await loadRooms();
      }
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleSelectRoom = async (roomId: string): Promise<void> => {
    setSelectedRoom(roomId);

    try {
      // Join the room
      await roomService.joinRoom(roomId, userId);

      // Get room players
      const players = await roomService.getRoomPlayers(roomId);
      if (players) {
        setRoomPlayers(players.map((p) => p.player_id));
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const handleLeaveRoom = async (): Promise<void> => {
    if (!selectedRoom) return;

    try {
      await roomService.leaveRoom(selectedRoom, userId);
      setSelectedRoom(null);
      setRoomPlayers([]);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Room List */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Available Rooms</h2>

        {loading ? (
          <p className="text-gray-500">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-500">No rooms available. Create one!</p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room.id)}
                className={`w-full rounded px-4 py-2 text-left transition ${
                  selectedRoom === room.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                <div className="font-semibold">{room.name}</div>
                <div className="text-xs opacity-75">
                  Created: {new Date(room.created_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Room / Room Details */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Create New Room</h2>

        <form onSubmit={handleCreateRoom} className="space-y-4">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name..."
            maxLength={100}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />

          <button
            type="submit"
            disabled={creating || !newRoomName.trim()}
            className="w-full rounded bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-600 disabled:bg-gray-400"
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </form>

        {/* Room Details */}
        {selectedRoom && (
          <div className="mt-6 border-t pt-6">
            <h3 className="mb-4 font-semibold">Room Players ({roomPlayers.length})</h3>

            {roomPlayers.length === 0 ? (
              <p className="text-gray-500">No players in this room yet.</p>
            ) : (
              <div className="space-y-2">
                {roomPlayers.map((playerId) => (
                  <div
                    key={playerId}
                    className="flex items-center justify-between rounded bg-blue-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{playerId}</span>
                    {playerId === userId && <span className="text-xs text-blue-600">You</span>}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleLeaveRoom}
              className="mt-4 w-full rounded bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
            >
              Leave Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PokemonSummary } from '@/types/pokemon';

interface TeamState {
  members: PokemonSummary[];
  addMember: (member: PokemonSummary) => boolean;
  removeMember: (id: number) => void;
  clearTeam: () => void;
  replaceMember: (member: PokemonSummary) => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      members: [],
      addMember: (member) => {
        const exists = get().members.some((entry) => entry.id === member.id);
        if (exists || get().members.length >= 6) {
          return false;
        }
        set((state) => ({ members: [...state.members, member] }));
        return true;
      },
      removeMember: (id) => set((state) => ({ members: state.members.filter((member) => member.id !== id) })),
      clearTeam: () => set({ members: [] }),
      replaceMember: (member) =>
        set((state) => {
          const without = state.members.filter((entry) => entry.id !== member.id);
          if (without.length >= 6) {
            return { members: without };
          }
          return { members: [...without, member] };
        }),
    }),
    {
      name: 'pokedex-pro-team',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
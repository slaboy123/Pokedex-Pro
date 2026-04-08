import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FavoritesState {
  ids: number[];
  toggleFavorite: (id: number) => void;
  removeFavorite: (id: number) => void;
  clearFavorites: () => void;
  isFavorite: (id: number) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggleFavorite: (id) =>
        set((state) => ({
          ids: state.ids.includes(id) ? state.ids.filter((favoriteId) => favoriteId !== id) : [...state.ids, id],
        })),
      removeFavorite: (id) => set((state) => ({ ids: state.ids.filter((favoriteId) => favoriteId !== id) })),
      clearFavorites: () => set({ ids: [] }),
      isFavorite: (id) => get().ids.includes(id),
    }),
    {
      name: 'pokedex-pro-favorites',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PokedexFilters } from '@/types/app';
import type { PokemonSummary } from '@/types/pokemon';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useTeamStore } from '@/store/teamStore';
import { useToastStore } from '@/store/toastStore';
import { usePokemonCatalog } from '@/hooks/usePokemonCatalog';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { FiltersSidebar } from './FiltersSidebar';
import { PokemonGrid } from './PokemonGrid';
import { PokemonDetailsModal } from './PokemonDetailsModal';

const INITIAL_FILTERS: PokedexFilters = {
  query: '',
  type: '',
  generation: '',
  ability: '',
};

export const PokedexPage = (): JSX.Element => {
  const [filters, setFilters] = useState<PokedexFilters>(INITIAL_FILTERS);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonSummary | null>(null);
  const { items, loading, loadingMore, hasMore, error, loadMore, refresh } = usePokemonCatalog(filters);
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const addMember = useTeamStore((state) => state.addMember);
  const pushToast = useToastStore((state) => state.pushToast);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const intersecting = useIntersectionObserver(sentinelRef, { threshold: 0.1, freezeOnceVisible: false });

  useEffect(() => {
    if (intersecting && hasMore && !loadingMore) {
      loadMore();
    }
  }, [hasMore, intersecting, loadMore, loadingMore]);

  const favoritesCount = useMemo(() => favoriteIds.length, [favoriteIds]);

  const notifyFavorite = (pokemon: PokemonSummary): void => {
    toggleFavorite(pokemon.id);
    pushToast({
      title: 'Favorites',
      message: `${pokemon.name} alternado nos favoritos.`,
      tone: 'info',
    });
  };

  const notifyTeam = (pokemon: PokemonSummary): void => {
    const added = addMember(pokemon);
    pushToast({
      title: added ? 'Team' : 'Team full',
      message: added ? `${pokemon.name} entrou para o time.` : 'O time já está com 6 Pokémon.',
      tone: added ? 'success' : 'warning',
    });
  };

  return (
    <div className="grid gap-4 md:gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-6">
        <FiltersSidebar
          filters={filters}
          onChange={setFilters}
          onReset={() => {
            setFilters(INITIAL_FILTERS);
            refresh();
          }}
        />

        <div className="rpg-panel p-4 md:p-5">
          <p className="rpg-tag">Status</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-[#e8d8b4]">
            <div className="rounded-2xl border border-neon-green/20 bg-black/25 p-3">
              <p className="text-[#bfae89]">Loaded</p>
              <p className="mt-1 text-lg font-bold text-[#f8edd7]">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-neon-green/20 bg-black/25 p-3">
              <p className="text-[#bfae89]">Favorites</p>
              <p className="mt-1 text-lg font-bold text-[#f8edd7]">{favoritesCount}</p>
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        <section className="rpg-panel p-5 md:p-7">
          <p className="text-xs uppercase tracking-[0.3em] text-neon-purple">Pokedex</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f8edd7] sm:text-4xl md:text-5xl">Grimorio de Monstros</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#ddcda9] sm:text-base">
            Explore criaturas com rolagem infinita, filtros taticos, cartas shiny e dados detalhados para montar seu grupo de batalha.
          </p>
        </section>

        <PokemonGrid
          items={items}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onSelect={setSelectedPokemon}
          onToggleFavorite={notifyFavorite}
          onAddToTeam={notifyTeam}
          isFavorite={(id) => favoriteIds.includes(id)}
          sentinelRef={sentinelRef}
        />
      </div>

      <PokemonDetailsModal pokemon={selectedPokemon} onClose={() => setSelectedPokemon(null)} />
    </div>
  );
};
import type { PokemonSummary } from '@/types/pokemon';
import { PokemonCard } from './PokemonCard';
import { SkeletonCard } from './SkeletonCard';
import type { RefObject } from 'react';

interface PokemonGridProps {
  items: PokemonSummary[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onSelect: (pokemon: PokemonSummary) => void;
  onToggleFavorite: (pokemon: PokemonSummary) => void;
  onAddToTeam: (pokemon: PokemonSummary) => void;
  isFavorite: (id: number) => boolean;
  sentinelRef: RefObject<HTMLDivElement>;
}

export const PokemonGrid = ({
  items,
  loading,
  loadingMore,
  hasMore,
  onSelect,
  onToggleFavorite,
  onAddToTeam,
  isFavorite,
  sentinelRef,
}: PokemonGridProps): JSX.Element => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1700px]:grid-cols-5">
        {Array.from({ length: 12 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1700px]:grid-cols-5">
        {items.map((pokemon) => (
          <PokemonCard
            key={pokemon.id}
            pokemon={pokemon}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
            onAddToTeam={onAddToTeam}
            isFavorite={isFavorite(pokemon.id)}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />

      {loadingMore ? <p className="text-center text-sm text-white/60">Loading more Pokémon...</p> : null}
      {!hasMore && items.length > 0 ? <p className="text-center text-sm text-white/40">Você chegou ao fim do catálogo filtrado.</p> : null}
    </div>
  );
};
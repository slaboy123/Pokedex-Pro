import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { PokemonSummary } from '@/types/pokemon';
import { formatId } from '@/utils/pokemon';
import { TypeBadge } from '@/features/pokemon/components/TypeBadge';
import { getPokemonSprite, preloadSprite } from '@/services/spriteService';

interface PokemonCardProps {
  pokemon: PokemonSummary;
  onSelect: (pokemon: PokemonSummary) => void;
  onToggleFavorite: (pokemon: PokemonSummary) => void;
  onAddToTeam: (pokemon: PokemonSummary) => void;
  isFavorite: boolean;
}

export const PokemonCard = ({ pokemon, onSelect, onToggleFavorite, onAddToTeam, isFavorite }: PokemonCardProps): JSX.Element => {
  const [shiny, setShiny] = useState(false);
  const [hoverSprite, setHoverSprite] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = (): void => {
      setCanHover(query.matches);
    };

    update();
    query.addEventListener('change', update);
    return () => {
      query.removeEventListener('change', update);
    };
  }, []);

  const sprite = hovering && hoverSprite ? hoverSprite : shiny ? pokemon.shinySprite : pokemon.sprite;

  const handleMouseEnter = async (): Promise<void> => {
    if (!canHover) {
      return;
    }

    setHovering(true);
    try {
      const data = await getPokemonSprite(pokemon.name);
      if (!data?.front) {
        return;
      }
      await preloadSprite(data.front);
      setHoverSprite(data.front);
    } catch {
      setHoverSprite(null);
    }
  };

  const handleMouseLeave = (): void => {
    if (!canHover) {
      return;
    }

    setHovering(false);
  };

  return (
    <motion.article
      className="group relative overflow-hidden rounded-3xl border border-rose-300/30 bg-[linear-gradient(160deg,rgba(18,10,12,0.95),rgba(10,6,7,0.96))] p-3 shadow-neon transition hover:-translate-y-1 hover:border-rose-300/60 sm:p-4"
      whileHover={canHover ? { y: -3 } : undefined}
      layout
      onMouseEnter={() => {
        void handleMouseEnter();
      }}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-rose-300/70 to-transparent" />
      <div
        role="button"
        tabIndex={0}
        className="w-full text-left outline-none"
        onClick={() => onSelect(pokemon)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(pokemon);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-rose-300/30 bg-black/30 px-2.5 py-1 text-xs font-bold text-[#f0d9da]">{formatId(pokemon.id)}</span>
          <button
            type="button"
            className="min-h-11 rounded-full border border-rose-300/35 bg-black/30 px-3 py-1 text-xs font-semibold text-[#f2dedd] transition hover:border-rose-300/70 hover:bg-rose-300/20"
            onClick={(event) => {
              event.stopPropagation();
              setShiny((value) => !value);
            }}
          >
            {shiny ? 'Shiny' : 'Normal'}
          </button>
        </div>

        <div className="mx-auto mt-4 flex aspect-square w-full max-w-[10.5rem] items-center justify-center rounded-2xl border border-rose-300/25 bg-black/25 p-3 sm:max-w-[11.5rem] sm:p-4">
          <img
            src={sprite}
            alt={pokemon.name}
            className="drop-shadow-2xl transition duration-200 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            style={{ 
              imageRendering: 'crisp-edges',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-[#f8edd7]">{pokemon.name}</h3>
            <p className="text-sm text-[#c9b791]">{pokemon.mainType}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggleFavorite(pokemon)}
          className={`min-h-11 rounded-full border px-3 py-2 text-xs font-bold transition ${isFavorite ? 'border-rose-300 bg-rose-300 text-[#26070c]' : 'border-rose-300/30 bg-black/20 text-[#f6e8e8] hover:border-rose-300/55 hover:bg-black/35'}`}
        >
          {isFavorite ? 'Favorited' : 'Favorite'}
        </button>
        <button
          type="button"
          onClick={() => onAddToTeam(pokemon)}
          className="min-h-11 rounded-full border border-rose-300 bg-rose-300 px-3 py-2 text-xs font-bold text-[#26070c] transition hover:brightness-110"
        >
          Team
        </button>
      </div>
    </motion.article>
  );
};
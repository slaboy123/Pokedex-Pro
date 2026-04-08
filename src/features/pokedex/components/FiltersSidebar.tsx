import type { PokedexFilters } from '@/types/app';
import { GENERATION_OPTIONS, POKEMON_TYPES } from '../pokedex.constants';

interface FiltersSidebarProps {
  filters: PokedexFilters;
  onChange: (next: PokedexFilters) => void;
  onReset: () => void;
}

export const FiltersSidebar = ({ filters, onChange, onReset }: FiltersSidebarProps): JSX.Element => {
  return (
    <aside className="rpg-panel space-y-4 p-4 md:sticky md:top-6">
      <div>
        <p className="rpg-tag">Filters</p>
        <h2 className="mt-2 text-lg font-extrabold text-[#f8edd7]">Buscar no Grimorio</h2>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#eadbb9]">Search by name</span>
        <input
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          placeholder="Pikachu, Charizard..."
          className="rpg-input"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#eadbb9]">Type</span>
        <select
          value={filters.type}
          onChange={(event) => onChange({ ...filters, type: event.target.value })}
          className="rpg-input"
        >
          <option value="">All types</option>
          {POKEMON_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#eadbb9]">Generation</span>
        <select
          value={filters.generation}
          onChange={(event) => onChange({ ...filters, generation: event.target.value })}
          className="rpg-input"
        >
          <option value="">All generations</option>
          {GENERATION_OPTIONS.map((generation) => (
            <option key={generation.value} value={generation.value}>
              {generation.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#eadbb9]">Ability</span>
        <input
          value={filters.ability}
          onChange={(event) => onChange({ ...filters, ability: event.target.value.toLowerCase() })}
          placeholder="static, blaze, levitate..."
          className="rpg-input"
        />
      </label>

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-2xl border border-neon-green/35 bg-black/25 px-4 py-3 font-bold text-[#f6ebd3] transition hover:border-neon-green/70 hover:bg-black/35"
      >
        Reset filters
      </button>
    </aside>
  );
};
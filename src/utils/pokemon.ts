import type { PokemonResponse, PokemonSummary, TypeEffectiveness, TypeResponse } from '@/types/pokemon';

export const TYPE_COLORS: Record<string, string> = {
  normal: '#cbd5e1',
  fire: '#fb7185',
  water: '#60a5fa',
  electric: '#facc15',
  grass: '#4ade80',
  ice: '#67e8f9',
  fighting: '#fb923c',
  poison: '#c084fc',
  ground: '#fbbf24',
  flying: '#a78bfa',
  psychic: '#f472b6',
  bug: '#a3e635',
  rock: '#a3a3a3',
  ghost: '#818cf8',
  dragon: '#8b5cf6',
  dark: '#475569',
  steel: '#94a3b8',
  fairy: '#f9a8d4',
};

export const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export const toTitleCase = (value: string): string =>
  value
    .split('-')
    .map((part) => capitalize(part))
    .join(' ');

export const formatId = (id: number): string => `#${String(id).padStart(4, '0')}`;

export const getTypeColor = (type: string): string => TYPE_COLORS[type] ?? '#94a3b8';

export const cleanText = (value: string): string => value.replace(/\s+/g, ' ').replace(/\f/g, ' ').trim();

export const buildPokemonSummary = (pokemon: PokemonResponse): PokemonSummary => {
  const types = [...pokemon.types].sort((left, right) => left.slot - right.slot).map((slot) => slot.type.name);
  const typeColors = types.map((type) => getTypeColor(type));
  const mainType = types[0] ?? 'normal';
  const sprite = pokemon.sprites.other['official-artwork'].front_default ?? pokemon.sprites.front_default ?? '';
  const shinySprite = pokemon.sprites.other['official-artwork'].front_shiny ?? pokemon.sprites.front_shiny ?? sprite;

  return {
    id: pokemon.id,
    name: capitalize(pokemon.name),
    sprite,
    shinySprite,
    types,
    typeColors,
    mainType,
  };
};

export const buildEffectiveness = (relations: TypeResponse['damage_relations']): TypeEffectiveness => {
  return {
    weaknesses: relations.double_damage_from.map((entry) => entry.name),
    resistances: relations.half_damage_from.map((entry) => entry.name),
    immunities: relations.no_damage_from.map((entry) => entry.name),
  };
};

export const uniqueByName = <T extends { name: string }>(values: T[]): T[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value.name)) {
      return false;
    }
    seen.add(value.name);
    return true;
  });
};

export const sumStats = (pokemon: PokemonResponse): number =>
  pokemon.stats.reduce((total, stat) => total + stat.base_stat, 0);
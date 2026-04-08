export interface NamedAPIResource {
  name: string;
  url: string;
}

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedAPIResource[];
}

export interface PokemonTypeSlot {
  slot: number;
  type: NamedAPIResource;
}

export interface PokemonStatSlot {
  base_stat: number;
  effort: number;
  stat: NamedAPIResource;
}

export interface PokemonAbilitySlot {
  ability: NamedAPIResource;
  is_hidden: boolean;
  slot: number;
}

export interface PokemonMoveSlot {
  move: NamedAPIResource;
  version_group_details: Array<{
    level_learned_at: number;
    move_learn_method: NamedAPIResource;
    version_group: NamedAPIResource;
  }>;
}

export interface PokemonSprites {
  front_default: string | null;
  front_shiny: string | null;
  other: {
    'official-artwork': {
      front_default: string | null;
      front_shiny: string | null;
    };
  };
}

export interface PokemonResponse {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number | null;
  types: PokemonTypeSlot[];
  stats: PokemonStatSlot[];
  abilities: PokemonAbilitySlot[];
  moves: PokemonMoveSlot[];
  sprites: PokemonSprites;
  species: NamedAPIResource;
}

export interface PokemonSpeciesFlavorEntry {
  flavor_text: string;
  language: NamedAPIResource;
  version: NamedAPIResource;
}

export interface PokemonVariety {
  is_default: boolean;
  pokemon: NamedAPIResource;
}

export interface PokemonSpeciesResponse {
  id: number;
  name: string;
  flavor_text_entries: PokemonSpeciesFlavorEntry[];
  genera: Array<{ genus: string; language: NamedAPIResource }>;
  varieties: PokemonVariety[];
  evolution_chain: {
    url: string;
  };
}

export interface EvolutionChainLink {
  species: NamedAPIResource;
  evolves_to: EvolutionChainLink[];
  evolution_details: Array<{
    min_level: number | null;
    trigger: NamedAPIResource;
    item: NamedAPIResource | null;
  }>;
}

export interface EvolutionChainResponse {
  chain: EvolutionChainLink;
}

export interface TypeDamageRelation {
  double_damage_from: NamedAPIResource[];
  half_damage_from: NamedAPIResource[];
  no_damage_from: NamedAPIResource[];
  double_damage_to: NamedAPIResource[];
  half_damage_to: NamedAPIResource[];
  no_damage_to: NamedAPIResource[];
}

export interface TypeResponse {
  id: number;
  name: string;
  damage_relations: TypeDamageRelation;
}

export interface AbilityFlavorTextEntry {
  flavor_text: string;
  language: NamedAPIResource;
  version_group: NamedAPIResource;
}

export interface AbilityEffectEntry {
  effect: string;
  short_effect: string;
  language: NamedAPIResource;
}

export interface AbilityPokemonEntry {
  is_hidden: boolean;
  slot: number;
  pokemon: NamedAPIResource;
}

export interface AbilityResponse {
  id: number;
  name: string;
  effect_entries: AbilityEffectEntry[];
  flavor_text_entries: AbilityFlavorTextEntry[];
  pokemon: AbilityPokemonEntry[];
}

export interface MoveEffectEntry {
  effect: string;
  short_effect: string;
  language: NamedAPIResource;
}

export interface MoveResponse {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  priority: number;
  damage_class: NamedAPIResource | null;
  type: NamedAPIResource;
  effect_entries: MoveEffectEntry[];
}

export interface GenerationResponse {
  id: number;
  name: string;
  pokemon_species: NamedAPIResource[];
}

export interface PokemonSummary {
  id: number;
  name: string;
  sprite: string;
  shinySprite: string;
  types: string[];
  typeColors: string[];
  mainType: string;
}

export interface PokemonDetailBundle {
  summary: PokemonSummary;
  pokemon: PokemonResponse;
  species: PokemonSpeciesResponse;
  evolutionChain: EvolutionChainResponse;
}

export interface TypeEffectiveness {
  weaknesses: string[];
  resistances: string[];
  immunities: string[];
}
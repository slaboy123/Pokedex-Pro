import type {
  AbilityResponse,
  EvolutionChainResponse,
  GenerationResponse,
  MoveResponse,
  NamedAPIResource,
  PokemonDetailBundle,
  PokemonListResponse,
  PokemonResponse,
  PokemonSpeciesResponse,
  TypeResponse,
} from '@/types/pokemon';
import { buildPokemonSummary } from '@/utils/pokemon';

const API_BASE = 'https://pokeapi.co/api/v2';

const jsonCache = new Map<string, Promise<unknown>>();

const requestJson = async <T>(path: string): Promise<T> => {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const cached = jsonCache.get(url);
  if (cached) {
    return cached as Promise<T>;
  }

  const request = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  });

  jsonCache.set(url, request);
  return request;
};

export const getAllPokemonNames = async (): Promise<string[]> => {
  const data = await requestJson<PokemonListResponse>('/pokemon?limit=2000&offset=0');
  return data.results.map((item) => item.name);
};

export const getPokemonByNameOrId = async (identifier: string | number): Promise<PokemonResponse> =>
  requestJson<PokemonResponse>(`/pokemon/${identifier}`);

export const getPokemonSpeciesByNameOrId = async (identifier: string | number): Promise<PokemonSpeciesResponse> =>
  requestJson<PokemonSpeciesResponse>(`/pokemon-species/${identifier}`);

export const getEvolutionChainByUrl = async (url: string): Promise<EvolutionChainResponse> => requestJson<EvolutionChainResponse>(url);

export const getTypeByName = async (name: string): Promise<TypeResponse> => requestJson<TypeResponse>(`/type/${name}`);

export const getAbilityByName = async (name: string): Promise<AbilityResponse> => requestJson<AbilityResponse>(`/ability/${name}`);

export const getMoveByName = async (name: string): Promise<MoveResponse> => requestJson<MoveResponse>(`/move/${name}`);

export const getGenerationById = async (generation: string | number): Promise<GenerationResponse> =>
  requestJson<GenerationResponse>(`/generation/${generation}`);

export const getPokemonDetailBundle = async (identifier: string | number): Promise<PokemonDetailBundle> => {
  const pokemon = await getPokemonByNameOrId(identifier);
  const species = await getPokemonSpeciesByNameOrId(identifier);
  const evolutionChain = await getEvolutionChainByUrl(species.evolution_chain.url);

  return {
    summary: buildPokemonSummary(pokemon),
    pokemon,
    species,
    evolutionChain,
  };
};

export const getPokemonSummaries = async (names: string[]): Promise<PokemonDetailBundle[]> => {
  const results = await Promise.all(names.map(async (name) => getPokemonDetailBundle(name)));
  return results;
};

export const fetchRandomPokemonName = async (names: string[]): Promise<string> => {
  if (names.length === 0) {
    throw new Error('Nenhum Pokémon disponível para seleção.');
  }

  const index = Math.floor(Math.random() * names.length);
  return names[index] ?? names[0] ?? '';
};

export const extractResourceName = (resource: NamedAPIResource): string => resource.name;
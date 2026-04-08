import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PokedexFilters } from '@/types/app';
import type { PokemonSummary } from '@/types/pokemon';
import { getAbilityByName, getAllPokemonNames, getGenerationById, getPokemonDetailBundle, getTypeByName } from '@/services/pokeapi';
import { useDebouncedValue } from './useDebouncedValue';

const PAGE_SIZE = 24;

interface CatalogState {
  items: PokemonSummary[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
}

const toSet = (values: string[]): Set<string> => new Set(values.map((value) => value.toLowerCase()));

const intersect = (base: string[], set: Set<string> | null): string[] => (set ? base.filter((name) => set.has(name.toLowerCase())) : base);

export const usePokemonCatalog = (filters: PokedexFilters): CatalogState => {
  const [allNames, setAllNames] = useState<string[]>([]);
  const [candidateNames, setCandidateNames] = useState<string[]>([]);
  const [items, setItems] = useState<PokemonSummary[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedQuery = useDebouncedValue(filters.query, 250);

  useEffect(() => {
    let active = true;

    const bootstrap = async (): Promise<void> => {
      try {
        setLoading(true);
        const names = await getAllPokemonNames();
        if (active) {
          setAllNames(names);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar catálogo.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (allNames.length === 0) {
      return;
    }

    let active = true;

    const buildCandidateNames = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const normalizedQuery = debouncedQuery.trim().toLowerCase();
        const tasks: Array<Promise<Set<string> | null>> = [];

        if (filters.type) {
          tasks.push(getTypeByName(filters.type).then((data) => toSet(data.pokemon.map((entry) => entry.pokemon.name))));
        } else {
          tasks.push(Promise.resolve(null));
        }

        if (filters.ability) {
          tasks.push(getAbilityByName(filters.ability).then((data) => toSet(data.pokemon.map((entry) => entry.pokemon.name))));
        } else {
          tasks.push(Promise.resolve(null));
        }

        if (filters.generation) {
          tasks.push(
            getGenerationById(filters.generation).then((data) => toSet(data.pokemon_species.map((species) => species.name))),
          );
        } else {
          tasks.push(Promise.resolve(null));
        }

        const [typeSet, abilitySet, generationSet] = await Promise.all(tasks);
        let names = [...allNames];
        names = intersect(names, typeSet);
        names = intersect(names, abilitySet);
        names = intersect(names, generationSet);

        if (normalizedQuery.length > 0) {
          names = names.filter((name) => name.includes(normalizedQuery));
        }

        if (!active) {
          return;
        }

        setCandidateNames(names);
        setVisibleCount(PAGE_SIZE);

        const initialSlice = names.slice(0, PAGE_SIZE);
        const bundles = await Promise.all(initialSlice.map((name) => getPokemonDetailBundle(name)));

        if (!active) {
          return;
        }

        setItems(bundles.map((bundle) => bundle.summary));
        setHasMore(names.length > PAGE_SIZE);
      } catch (err) {
        if (active) {
          setItems([]);
          setHasMore(false);
          setError(err instanceof Error ? err.message : 'Falha ao filtrar o catálogo.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void buildCandidateNames();

    return () => {
      active = false;
    };
  }, [allNames, debouncedQuery, filters.ability, filters.generation, filters.type, refreshKey]);

  const loadMore = useCallback((): void => {
    if (loadingMore || loading || !hasMore) {
      return;
    }

    const nextStart = visibleCount;
    const nextSlice = candidateNames.slice(nextStart, nextStart + PAGE_SIZE);

    if (nextSlice.length === 0) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);

    void Promise.all(nextSlice.map((name) => getPokemonDetailBundle(name)))
      .then((bundles) => {
        setItems((current) => [...current, ...bundles.map((bundle) => bundle.summary)]);
        setVisibleCount((current) => current + nextSlice.length);
        setHasMore(nextStart + nextSlice.length < candidateNames.length);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Falha ao carregar mais Pokémon.');
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }, [candidateNames, hasMore, loading, loadingMore, visibleCount]);

  const refresh = useCallback((): void => setRefreshKey((value) => value + 1), []);

  return useMemo(
    () => ({
      items,
      loading,
      loadingMore,
      hasMore,
      error,
      loadMore,
      refresh,
    }),
    [error, hasMore, items, loadMore, loading, loadingMore, refresh],
  );
};
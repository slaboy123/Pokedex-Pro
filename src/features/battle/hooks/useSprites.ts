import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpriteEngineEvent, PokemonSpriteConfig, SpriteEngine } from '../sprite-engine';
import { globalSpriteEngine } from '../sprite-engine';
import { defaultAnimations } from '../sprite-engine/predefined-animations';
import { getCompleteSpriteSet } from '../sprite-engine/sprite-urls';

interface UseSpritesOptions {
  engine?: SpriteEngine;
  autoStart?: boolean;
}

export const useSprites = (options: UseSpritesOptions = {}) => {
  const { engine = globalSpriteEngine, autoStart = true } = options;
  const [events, setEvents] = useState<SpriteEngineEvent[]>([]);
  const eventsRef = useRef<SpriteEngineEvent[]>([]);

  useEffect(() => {
    const unsubscribe = engine.on((event: SpriteEngineEvent) => {
      eventsRef.current = [event, ...eventsRef.current].slice(0, 20);
      setEvents([...eventsRef.current]);
    });

    return unsubscribe;
  }, [engine]);

  useEffect(() => {
    if (!autoStart) {
      return;
    }

    engine.start();
    return () => engine.stop();
  }, [autoStart, engine]);

  const registerPokemon = useCallback(
    (pokemonId: number, pokemonName: string) => {
      const sprites = getCompleteSpriteSet(pokemonId, pokemonName, true, true);
      const config: PokemonSpriteConfig = {
        pokemonId,
        pokemonName,
        sprites,
        animations: defaultAnimations,
      };

      engine.registerPokemon(config);
    },
    [engine],
  );

  const preload = useCallback(
    async (pokemonIds: number[]) => {
      await engine.preloadPokemons(pokemonIds);
    },
    [engine],
  );

  const spawnSprite = useCallback(
    (pokemonId: number, side: 'player' | 'enemy', isShiny = false) => {
      engine.initializeSprite(pokemonId, side, isShiny);
      engine.switchIn(pokemonId, side);
    },
    [engine],
  );

  const playAttack = useCallback(
    (pokemonId: number, side: 'player' | 'enemy', callback?: () => void) => engine.attack(pokemonId, side, callback),
    [engine],
  );

  const playDamage = useCallback(
    (pokemonId: number, side: 'player' | 'enemy', callback?: () => void) => engine.takeDamage(pokemonId, side, callback),
    [engine],
  );

  const playFaint = useCallback(
    (pokemonId: number, side: 'player' | 'enemy', callback?: () => void) => engine.faint(pokemonId, side, callback),
    [engine],
  );

  const playSwitch = useCallback(
    (pokemonId: number, side: 'player' | 'enemy', callback?: () => void) => engine.switchIn(pokemonId, side, callback),
    [engine],
  );

  const getRenderState = useCallback(
    (pokemonId: number, side: 'player' | 'enemy') => engine.getRenderState(pokemonId, side),
    [engine],
  );

  return {
    engine,
    registerPokemon,
    preload,
    spawnSprite,
    playAttack,
    playDamage,
    playFaint,
    playSwitch,
    getRenderState,
    start: () => engine.start(),
    stop: () => engine.stop(),
    dispose: () => engine.dispose(),
    events,
  };
};

export const useSprite = (
  pokemonId: number,
  pokemonName: string,
  side: 'player' | 'enemy' = 'player',
  options: UseSpritesOptions = {},
) => {
  const sprites = useSprites(options);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    sprites.registerPokemon(pokemonId, pokemonName);
    sprites.spawnSprite(pokemonId, side);
    setIsReady(true);
  }, [pokemonId, pokemonName, side, sprites]);

  return {
    ...sprites,
    isReady,
  };
};

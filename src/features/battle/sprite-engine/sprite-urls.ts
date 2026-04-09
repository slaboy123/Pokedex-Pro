/**
 * Gerador de URLs de sprites animadas
 * Suporta múltiplas fontes: Pokémon Showdown, PokéAPI, Pokémon 3D, etc.
 */

import type { SpriteSource, SpriteFormat } from './sprite-engine.types';

/**
 * Normaliza nome de Pokémon para use em URLs
 */
export const normalizePokemonName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-') // espaços para hífens
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9-]/g, ''); // remove caracteres especiais
};

/**
 * Gera URL de sprite animada GIF (Pokémon Showdown)
 */
export const getShowdownGifUrl = (pokemonName: string, isShiny = false, variant: 'front' | 'back' = 'front'): SpriteSource => {
  const normalized = normalizePokemonName(pokemonName);
  const shinyPrefix = isShiny ? '-shiny' : '';
  const variantSuffix = variant === 'back' ? '' : ''; // Showdown usa 'ani' para ambos por padrão

  return {
    url: `https://raw.githubusercontent.com/smogon/pokemon-showdown/master/public/sprites/ani${shinyPrefix}/${normalized}.gif`,
    format: 'gif',
    width: 96,
    height: 96,
    isAnimated: true,
  };
};

/**
 * Gera URL de sprite animada WebP (Pokémon Showdown)
 * Alternativa mais moderna que GIF
 */
export const getShowdownWebpUrl = (pokemonName: string, isShiny = false): SpriteSource => {
  const normalized = normalizePokemonName(pokemonName);
  const shinyPrefix = isShiny ? '-shiny' : '';

  return {
    url: `https://raw.githubusercontent.com/smogon/pokemon-showdown/master/public/sprites/ani-webp${shinyPrefix}/${normalized}.webp`,
    format: 'webp',
    width: 96,
    height: 96,
    isAnimated: true,
  };
};

/**
 * Gera URL de sprite PNG estática (PokéAPI - fallback)
 */
export const getPokeApiStaticUrl = (pokemonName: string, isShiny = false, official = false): SpriteSource => {
  const type = official ? 'official-artwork' : 'front_default';
  const variant = isShiny ? 'front_shiny' : 'front_default';

  return {
    url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon${official ? '/other/official-artwork' : ''}/${isShiny ? 'shiny' : ''}/${pokemonName.toLowerCase()}.png`,
    format: 'png-spritesheet',
    width: official ? 256 : 96,
    height: official ? 256 : 96,
    isAnimated: false,
  };
};

/**
 * Gera spritesheet de sprite sheet (PNG com múltiplos frames)
 */
export const getSpriteSheetUrl = (pokemonName: string, isShiny = false): SpriteSource => {
  const normalized = normalizePokemonName(pokemonName);
  const shinyPrefix = isShiny ? '-shiny' : '';

  return {
    url: `https://raw.githubusercontent.com/smogon/pokemon-showdown/master/public/sprites/ani-spritesheets${shinyPrefix}/${normalized}.png`,
    format: 'png-spritesheet',
    width: 192, // 2 frames de 96x96
    height: 96,
    isAnimated: true,
    fallback: getShowdownGifUrl(pokemonName, isShiny),
  };
};

/**
 * Gera URL para modelo 3D (GLTF/GLB)
 * Fonte: Pokémon 3D models conversos ou geradores
 */
export const get3DModelUrl = (pokemonId: number, pokemonName: string): SpriteSource => {
  const normalized = normalizePokemonName(pokemonName);

  return {
    url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${pokemonId}.svg`,
    format: '3d',
    fallback: getShowdownGifUrl(pokemonName),
  };
};

/**
 * Estratégia de fallback em cascata
 * Tenta múltiplas fontes até conseguir carregar uma
 */
export const getSpriteWithFallback = (
  pokemonName: string,
  isShiny = false,
  variant: 'front' | 'back' = 'front',
): SpriteSource => {
  // Começa com WebP (mais moderno), depois GIF, depois PNG
  return {
    url: getShowdownWebpUrl(pokemonName, isShiny).url,
    format: 'webp',
    width: 96,
    height: 96,
    isAnimated: true,
    fallback: {
      ...getShowdownGifUrl(pokemonName, isShiny, variant),
      fallback: {
        ...getPokeApiStaticUrl(pokemonName, isShiny, true),
      },
    },
  };
};

/**
 * Gera URLs completas para front e back sprites
 */
export const getCompleteSpriteSet = (
  pokemonId: number,
  pokemonName: string,
  includeShiny = true,
  includeAnimated = true,
) => {
  return {
    front: includeAnimated ? getShowdownGifUrl(pokemonName, false, 'front') : getPokeApiStaticUrl(pokemonName, false, true),
    back: includeAnimated ? getShowdownGifUrl(pokemonName, false, 'back') : getPokeApiStaticUrl(pokemonName, false, true),
    frontShiny: includeShiny ? (includeAnimated ? getShowdownGifUrl(pokemonName, true, 'front') : getPokeApiStaticUrl(pokemonName, true, true)) : undefined,
    backShiny: includeShiny ? (includeAnimated ? getShowdownGifUrl(pokemonName, true, 'back') : getPokeApiStaticUrl(pokemonName, true, true)) : undefined,
  };
};

/**
 * Valida se a URL é acessível
 */
export const validateSpriteUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Detecta suporte a WebP no navegador
 */
export const supportsWebP = (): boolean => {
  if (typeof document === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  try {
    return canvas.toDataURL('image/webp').includes('image/webp');
  } catch {
    return false;
  }
};

/**
 * Seleciona o melhor formato baseado no suporte do navegador
 */
export const getBestSpriteFormat = (pokemonName: string, isShiny = false): SpriteSource => {
  if (supportsWebP()) {
    return getShowdownWebpUrl(pokemonName, isShiny);
  }
  return getShowdownGifUrl(pokemonName, isShiny);
};

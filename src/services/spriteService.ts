interface SpriteEntry {
  front: string;
  back: string;
}

const API_LATENCY_MS = 60;

const spriteMap: Record<string, SpriteEntry> = {
  charizard: {
    front: 'https://play.pokemonshowdown.com/sprites/ani/charizard.gif',
    back: 'https://play.pokemonshowdown.com/sprites/ani-back/charizard.gif',
  },
  pikachu: {
    front: 'https://play.pokemonshowdown.com/sprites/ani/pikachu.gif',
    back: 'https://play.pokemonshowdown.com/sprites/ani-back/pikachu.gif',
  },
  bulbasaur: {
    front: 'https://play.pokemonshowdown.com/sprites/ani/bulbasaur.gif',
    back: 'https://play.pokemonshowdown.com/sprites/ani-back/bulbasaur.gif',
  },
  mewtwo: {
    front: 'https://play.pokemonshowdown.com/sprites/ani/mewtwo.gif',
    back: 'https://play.pokemonshowdown.com/sprites/ani-back/mewtwo.gif',
  },
  mrmime: {
    front: 'https://play.pokemonshowdown.com/sprites/ani/mrmime.gif',
    back: 'https://play.pokemonshowdown.com/sprites/ani-back/mrmime.gif',
  },
};

const preloadCache = new Map<string, Promise<string>>();
const loadedUrls = new Set<string>();

const wait = async (ms: number): Promise<void> => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

const toShowdownSlug = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.']/g, '')
    .replace(/\s+/g, '-');
};

export const normalizeName = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const inferShowdownSprite = (slug: string): SpriteEntry => {
  const inferredFront = `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`;
  const inferredBack = `https://play.pokemonshowdown.com/sprites/ani-back/${slug}.gif`;
  return {
    front: inferredFront,
    back: inferredBack,
  };
};

const inferLegacyGen5Sprite = (normalized: string): SpriteEntry => {
  return {
    front: `https://img.pokemondb.net/sprites/black-white/anim/normal/${normalized}.gif`,
    back: `https://img.pokemondb.net/sprites/black-white/anim/back-normal/${normalized}.gif`,
  };
};

const canUsePair = async (entry: SpriteEntry): Promise<boolean> => {
  try {
    await Promise.all([preloadSprite(entry.front), preloadSprite(entry.back)]);
    return true;
  } catch {
    return false;
  }
};

export const getPokemonSprite = async (name: string): Promise<SpriteEntry | null> => {
  await wait(API_LATENCY_MS);
  const normalized = normalizeName(name);
  const showdownSlug = toShowdownSlug(name);

  if (spriteMap[normalized]) {
    return spriteMap[normalized];
  }

  // Prefer animated Showdown sprites, which cover Gen 6+ and newer entries.
  const candidates: SpriteEntry[] = [
    inferShowdownSprite(showdownSlug),
    inferShowdownSprite(normalized),
    inferLegacyGen5Sprite(normalized),
  ];

  for (const entry of candidates) {
    if (await canUsePair(entry)) {
      return entry;
    }
  }

  return null;
};

export const getAllSprites = async (): Promise<Record<string, SpriteEntry>> => {
  await wait(API_LATENCY_MS);
  return { ...spriteMap };
};

export const preloadSprite = async (url: string): Promise<string> => {
  if (!url) {
    return '';
  }

  if (loadedUrls.has(url)) {
    return url;
  }

  const existing = preloadCache.get(url);
  if (existing) {
    return existing;
  }

  const request = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      loadedUrls.add(url);
      resolve(url);
    };
    image.onerror = () => {
      reject(new Error(`failed to preload sprite: ${url}`));
    };
    image.src = url;
  }).finally(() => {
    preloadCache.delete(url);
  });

  preloadCache.set(url, request);
  return request;
};

/**
 * Sprite Engine Types
 * Sistema de tipos para renderização de sprites animadas em batalhas
 */

export type SpriteFormat = 'gif' | 'png-spritesheet' | 'webp' | 'gltf' | '3d';
export type AnimationName = 'idle' | 'attack' | 'hit' | 'faint' | 'switch-in' | 'switch-out';
export type Side = 'player' | 'enemy';

/**
 * Informações de uma fonte de sprite
 */
export interface SpriteSource {
  url: string;
  format: SpriteFormat;
  width?: number;
  height?: number;
  isAnimated?: boolean;
  fallback?: SpriteSource; // Fonte alternativa caso falhe
}

/**
 * Dados de uma animação
 */
export interface AnimationData {
  name: AnimationName;
  duration: number; // em ms
  loop: boolean;
  frames?: number; // para sprite sheets
  frameRate?: number;
  startX?: number; // posição inicial X (para movimento)
  startY?: number;
  endX?: number; // posição final X
  endY?: number;
  scale?: { from: number; to: number }; // escala da animação
  opacity?: { from: number; to: number };
  rotation?: { from: number; to: number };
  effect?: 'shake' | 'flash' | 'fade' | 'blur'; // efeito visual
}

/**
 * Configuração de sprites para um Pokémon
 */
export interface PokemonSpriteConfig {
  pokemonId: number;
  pokemonName: string;
  sprites: {
    front: SpriteSource;
    back: SpriteSource;
    frontShiny?: SpriteSource;
    backShiny?: SpriteSource;
  };
  animations: Partial<Record<AnimationName, AnimationData>>;
}

/**
 * Estado de renderização de um Pokémon no campo
 */
export interface SpriteRenderState {
  pokemonId: number;
  side: Side;
  isActive: boolean;
  isShiny: boolean;
  currentAnimation: AnimationName | null;
  animationProgress: number; // 0-1
  position: { x: number; y: number };
  scale: number;
  opacity: number;
  rotation: number;
  effects: {
    shake?: number; // intensidade do shake
    flash?: number; // intensidade do flash
    blur?: number; // blur amount
  };
}

/**
 * Fila de animações para executar
 */
export interface AnimationQueueItem {
  id: string;
  pokemonId: number;
  side: Side;
  animation: AnimationName;
  duration?: number;
  callback?: () => void;
  priority?: number; // maior prioridade = executar antes
}

/**
 * Resultado de carregamento de sprite
 */
export interface SpriteLoadResult {
  success: boolean;
  data?: HTMLImageElement | HTMLCanvasElement;
  format: SpriteFormat;
  url: string;
  cached: boolean;
  error?: Error;
}

/**
 * Estatísticas de cache
 */
export interface SpritesCacheStats {
  totalLoaded: number;
  totalFailed: number;
  totalCached: number;
  memoryUsage: number;
  hitRate: number; // percentual de cache hits
}

/**
 * Contexto do motor de sprites
 */
export interface SpriteEngineContext {
  preloadQueue: PokemonSpriteConfig[];
  renderStates: Map<string, SpriteRenderState>;
  animationQueue: AnimationQueueItem[];
  cacheStats: SpritesCacheStats;
  isPreloading: boolean;
  isRunning: boolean;
}

/**
 * Eventos do motor de sprites
 */
export type SpriteEngineEventType = 'animation-start' | 'animation-end' | 'sprite-loaded' | 'sprite-failed' | 'cache-cleared';

export interface SpriteEngineEvent {
  type: SpriteEngineEventType;
  pokemonId?: number;
  animation?: AnimationName;
  data?: any;
  timestamp: number;
}

/**
 * Configuração do Three.js para sprites 3D
 */
export interface ThreeJsConfig {
  enabled: boolean;
  modelUrl?: string;
  scale?: number;
  position?: { x: number; y: number; z: number };
  lighting?: {
    ambient: number;
    directional: number;
    directionalPosition?: { x: number; y: number; z: number };
  };
}

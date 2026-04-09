import { globalSpriteLoader, type SpriteLoader } from './sprite-loader';
import { AnimationQueue, SpriteRenderStateManager } from './sprite-animations';
import type {
  AnimationName,
  PokemonSpriteConfig,
  Side,
  SpriteEngineContext,
  SpriteEngineEvent,
  SpriteRenderState,
} from './sprite-engine.types';

type SpriteEngineListener = (event: SpriteEngineEvent) => void;

export class SpriteEngine {
  private loader: SpriteLoader;
  private animationQueue = new AnimationQueue();
  private renderStateManager = new SpriteRenderStateManager();
  private pokemonConfigs = new Map<number, PokemonSpriteConfig>();
  private listeners = new Set<SpriteEngineListener>();
  private isRunning = false;
  private rafId: number | null = null;

  constructor(loader: SpriteLoader = globalSpriteLoader) {
    this.loader = loader;
  }

  registerPokemon(config: PokemonSpriteConfig): void {
    this.pokemonConfigs.set(config.pokemonId, config);
  }

  registerPokemons(configs: PokemonSpriteConfig[]): void {
    configs.forEach((config) => this.registerPokemon(config));
  }

  async preloadPokemon(pokemonId: number): Promise<boolean> {
    const config = this.pokemonConfigs.get(pokemonId);
    if (!config) {
      return false;
    }

    const sources = [
      config.sprites.front,
      config.sprites.back,
      config.sprites.frontShiny,
      config.sprites.backShiny,
    ].filter(Boolean) as NonNullable<PokemonSpriteConfig['sprites'][keyof PokemonSpriteConfig['sprites']]>[];

    const results = await this.loader.preload(sources);
    return results.every((result) => result.success);
  }

  async preloadPokemons(pokemonIds: number[]): Promise<void> {
    await Promise.all(pokemonIds.map((pokemonId) => this.preloadPokemon(pokemonId)));
  }

  initializeSprite(pokemonId: number, side: Side, isShiny = false): void {
    this.renderStateManager.setState(pokemonId, side, {
      pokemonId,
      side,
      isActive: true,
      isShiny,
      currentAnimation: 'idle',
      animationProgress: 0,
      position: side === 'player' ? { x: 0, y: 0 } : { x: 0, y: 0 },
      scale: 1,
      opacity: 1,
      rotation: 0,
      effects: {},
    });
  }

  playAnimation(
    pokemonId: number,
    side: Side,
    animation: AnimationName,
    callback?: () => void,
  ): string {
    const id = this.animationQueue.enqueue({
      pokemonId,
      side,
      animation,
      duration: animation === 'attack' ? 420 : animation === 'hit' ? 260 : 360,
      callback,
      priority: animation === 'attack' ? 10 : 0,
    });

    this.renderStateManager.updateAnimation(pokemonId, side, animation, 0);
    this.emit({ type: 'animation-start', pokemonId, animation });
    return id;
  }

  attack(pokemonId: number, side: Side, callback?: () => void): string {
    return this.playAnimation(pokemonId, side, 'attack', callback);
  }

  takeDamage(pokemonId: number, side: Side, callback?: () => void): string {
    return this.playAnimation(pokemonId, side, 'hit', callback);
  }

  switchIn(pokemonId: number, side: Side, callback?: () => void): string {
    return this.playAnimation(pokemonId, side, 'switch-in', callback);
  }

  faint(pokemonId: number, side: Side, callback?: () => void): string {
    return this.playAnimation(pokemonId, side, 'faint', callback);
  }

  getRenderState(pokemonId: number, side: Side): SpriteRenderState | null {
    return this.renderStateManager.getState(pokemonId, side);
  }

  on(listener: SpriteEngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const tick = () => {
      if (!this.isRunning) {
        return;
      }
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getContext(): SpriteEngineContext {
    return {
      preloadQueue: [],
      renderStates: new Map(),
      animationQueue: [],
      cacheStats: this.loader.getCacheStats(),
      isPreloading: false,
      isRunning: this.isRunning,
    };
  }

  dispose(): void {
    this.stop();
    this.animationQueue.clear();
    this.renderStateManager.clear();
    this.pokemonConfigs.clear();
    this.listeners.clear();
  }

  private emit(event: Omit<SpriteEngineEvent, 'timestamp'>): void {
    const payload: SpriteEngineEvent = { ...event, timestamp: Date.now() };
    this.listeners.forEach((listener) => listener(payload));
  }
}

export const globalSpriteEngine = new SpriteEngine();

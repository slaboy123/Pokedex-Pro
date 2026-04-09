import type { SpriteEngine } from './sprite-engine';
import type { SpriteEngineEvent, SpriteRenderState, SpritesCacheStats } from './sprite-engine.types';

export class SpriteEventLogger {
  private events: SpriteEngineEvent[] = [];

  constructor(private maxEvents = 100) {}

  log(event: SpriteEngineEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  getEvents(): SpriteEngineEvent[] {
    return [...this.events];
  }

  getEventsByType(type: SpriteEngineEvent['type']): SpriteEngineEvent[] {
    return this.events.filter((event) => event.type === type);
  }

  clear(): void {
    this.events = [];
  }
}

export class SpritePerformanceMonitor {
  private frameCount = 0;
  private lastCheck = performance.now();
  private currentFps = 0;
  private durations: number[] = [];

  recordFrame(): void {
    this.frameCount += 1;
    const now = performance.now();
    if (now - this.lastCheck >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastCheck = now;
    }
  }

  recordAnimationDuration(duration: number): void {
    this.durations.push(duration);
    if (this.durations.length > 100) {
      this.durations.shift();
    }
  }

  getFps(): number {
    return this.currentFps;
  }

  getAverageAnimationDuration(): number {
    if (this.durations.length === 0) {
      return 0;
    }

    return this.durations.reduce((sum, value) => sum + value, 0) / this.durations.length;
  }
}

export const formatRenderState = (state: SpriteRenderState): string => {
  return [
    `Pokemon ID: ${state.pokemonId}`,
    `Side: ${state.side}`,
    `Animation: ${state.currentAnimation ?? 'none'}`,
    `Progress: ${(state.animationProgress * 100).toFixed(1)}%`,
    `Position: (${state.position.x.toFixed(1)}, ${state.position.y.toFixed(1)})`,
    `Scale: ${state.scale.toFixed(2)}`,
    `Opacity: ${state.opacity.toFixed(2)}`,
    `Rotation: ${state.rotation.toFixed(1)}°`,
  ].join('\n');
};

export const formatCacheStats = (stats: SpritesCacheStats): string => {
  return [
    `Loaded: ${stats.totalLoaded}`,
    `Cached: ${stats.totalCached}`,
    `Failed: ${stats.totalFailed}`,
    `Memory: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
    `Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`,
  ].join('\n');
};

export const showDebugStats = (engine: SpriteEngine): void => {
  const context = engine.getContext();
  console.log('Sprite engine status', {
    running: context.isRunning,
    preloading: context.isPreloading,
    cache: context.cacheStats,
    queueSize: context.animationQueue.length,
  });
};

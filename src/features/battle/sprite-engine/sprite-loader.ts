/**
 * Cache e Loader de Sprites
 * Gerencia carregamento, cache e fallback de sprites
 */

import type { SpriteLoadResult, SpriteSource, SpritesCacheStats } from './sprite-engine.types';

interface CacheEntry {
  data: HTMLImageElement | HTMLCanvasElement;
  url: string;
  timestamp: number;
  accessCount: number;
}

/**
 * Gerenciador de cache de sprites
 */
class SpriteCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 50 * 1024 * 1024; // 50MB padrão
  private currentSize: number = 0;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSizeInMB = 50) {
    this.maxSize = maxSizeInMB * 1024 * 1024;
  }

  /**
   * Obtém sprite do cache
   */
  get(url: string): HTMLImageElement | HTMLCanvasElement | null {
    const entry = this.cache.get(url);
    if (!entry) {
      this.misses++;
      return null;
    }

    entry.accessCount++;
    entry.timestamp = Date.now();
    this.hits++;
    return entry.data;
  }

  /**
   * Adiciona sprite ao cache
   */
  set(url: string, data: HTMLImageElement | HTMLCanvasElement): void {
    // Remove entrada antiga se existir
    if (this.cache.has(url)) {
      const old = this.cache.get(url)!;
      this.currentSize -= this.getElementSize(old.data);
    }

    const size = this.getElementSize(data);

    // Libera espaço se necessário (LRU - Least Recently Used)
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      const lru = Array.from(this.cache.values()).reduce((prev, curr) =>
        curr.timestamp < prev.timestamp ? curr : prev,
      );

      const lruUrl = Array.from(this.cache.entries()).find(([_, v]) => v === lru)?.[0];
      if (lruUrl) {
        this.delete(lruUrl);
      }
    }

    this.cache.set(url, {
      data,
      url,
      timestamp: Date.now(),
      accessCount: 1,
    });

    this.currentSize += size;
  }

  /**
   * Remove sprite do cache
   */
  delete(url: string): void {
    const entry = this.cache.get(url);
    if (entry) {
      this.currentSize -= this.getElementSize(entry.data);
      this.cache.delete(url);
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): SpritesCacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      totalLoaded: this.cache.size,
      totalFailed: 0,
      totalCached: this.cache.size,
      memoryUsage: this.currentSize,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
    };
  }

  /**
   * Estima tamanho de um elemento em bytes
   */
  private getElementSize(element: HTMLImageElement | HTMLCanvasElement): number {
    if (element instanceof HTMLImageElement) {
      return (element.width * element.height * 4) + 1000; // RGBA + overhead
    } else if (element instanceof HTMLCanvasElement) {
      return (element.width * element.height * 4) + 1000;
    }
    return 1000;
  }
}

/**
 * Carregador de sprites com retry e fallback
 */
export class SpriteLoader {
  private cache: SpriteCache;
  private loadingQueue: Map<string, Promise<SpriteLoadResult>> = new Map();
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // ms

  constructor(cacheSizeInMB = 50) {
    this.cache = new SpriteCache(cacheSizeInMB);
  }

  /**
   * Carrega sprite com suporte a retry e fallback
   */
  async load(source: SpriteSource, useCache = true): Promise<SpriteLoadResult> {
    // Retorna se está carregando
    if (this.loadingQueue.has(source.url)) {
      return this.loadingQueue.get(source.url)!;
    }

    // Verifica cache
    if (useCache) {
      const cached = this.cache.get(source.url);
      if (cached) {
        return {
          success: true,
          data: cached,
          format: source.format,
          url: source.url,
          cached: true,
        };
      }
    }

    const promise = this.loadWithRetry(source);
    this.loadingQueue.set(source.url, promise);

    const result = await promise;
    this.loadingQueue.delete(source.url);

    // Tenta fallback se falhou
    if (!result.success && source.fallback) {
      return this.load(source.fallback, useCache);
    }

    return result;
  }

  /**
   * Carrega sprite com retry automático
   */
  private async loadWithRetry(source: SpriteSource, attempt = 0): Promise<SpriteLoadResult> {
    try {
      const result = await this.loadImage(source.url);

      // Cache o resultado
      this.cache.set(source.url, result);

      return {
        success: true,
        data: result,
        format: source.format,
        url: source.url,
        cached: false,
      };
    } catch (error) {
      if (attempt < this.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        return this.loadWithRetry(source, attempt + 1);
      }

      return {
        success: false,
        format: source.format,
        url: source.url,
        cached: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Carrega imagem como HTMLImageElement
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => {
        reject(new Error(`Image load timeout: ${url}`));
      }, 30000); // 30 segundos timeout

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Precarrega múltiplas sprites
   */
  async preload(sources: SpriteSource[]): Promise<SpriteLoadResult[]> {
    return Promise.all(sources.map((source) => this.load(source)));
  }

  /**
   * Libera cache de uma URL específica
   */
  evict(url: string): void {
    this.cache.delete(url);
  }

  /**
   * Limpa todo cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats(): SpritesCacheStats {
    return this.cache.getStats();
  }

  /**
   * Define número máximo de tentativas
   */
  setMaxRetries(retries: number): void {
    this.maxRetries = retries;
  }

  /**
   * Define delay entre tentativas
   */
  setRetryDelay(delayMs: number): void {
    this.retryDelay = delayMs;
  }
}

// Instância global
export const globalSpriteLoader = new SpriteLoader(50);

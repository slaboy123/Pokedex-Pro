/**
 * Motor de Animações de Sprites
 * Gerencia fila de animações e sincroniza com battle engine
 */

import type {
  AnimationQueueItem,
  AnimationName,
  SpriteRenderState,
  Side,
} from './sprite-engine.types';

type AnimationCallback = () => void | Promise<void>;

/**
 * Gerenciador de fila de animações
 */
export class AnimationQueue {
  private queue: AnimationQueueItem[] = [];
  private isProcessing = false;
  private callbacks: Map<string, Set<AnimationCallback>> = new Map();
  private activeAnimations: Map<string, AnimationQueueItem> = new Map();
  private animationFrameId: number | null = null;

  /**
   * Adiciona animação à fila
   */
  enqueue(item: Omit<AnimationQueueItem, 'id'>): string {
    const id = crypto.randomUUID();
    const queuePriority = item.priority ?? 0;
    const queueItem: AnimationQueueItem = {
      ...item,
      id,
      priority: queuePriority,
    };

    // Insere na posição correta baseado em prioridade
    const insertIndex = this.queue.findIndex((q) => (q.priority ?? 0) < queuePriority);
    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    this.processQueue();
    return id;
  }

  /**
   * Remove animação da fila
   */
  dequeue(id: string): void {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Obtém animação ativa para um Pokémon
   */
  getActiveAnimation(pokemonId: number, side: Side): AnimationQueueItem | null {
    const key = `${side}-${pokemonId}`;
    return this.activeAnimations.get(key) ?? null;
  }

  /**
   * Registra callback para quando uma animação termina
   */
  onAnimationEnd(animationName: AnimationName, callback: AnimationCallback): () => void {
    if (!this.callbacks.has(animationName)) {
      this.callbacks.set(animationName, new Set());
    }

    this.callbacks.get(animationName)!.add(callback);

    // Retorna função para remover listener
    return () => {
      this.callbacks.get(animationName)?.delete(callback);
    };
  }

  /**
   * Processa a fila de animações
   */
  private processQueue(): void {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.processNext();
  }

  /**
   * Processa próxima animação
   */
  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    const item = this.queue.shift()!;
    const key = `${item.side}-${item.pokemonId}`;

    this.activeAnimations.set(key, item);

    try {
      // Aguarda duração da animação
      await new Promise((resolve) => {
        setTimeout(resolve, item.duration ?? 600);
      });

      // Chama callback se definido
      if (item.callback) {
        await item.callback();
      }

      // Dispara eventos de término
      if (this.callbacks.has(item.animation)) {
        const callbacks = this.callbacks.get(item.animation)!;
        for (const callback of callbacks) {
          await callback();
        }
      }
    } finally {
      this.activeAnimations.delete(key);
      this.processNext();
    }
  }

  /**
   * Limpa a fila
   */
  clear(): void {
    this.queue = [];
    this.activeAnimations.clear();
    this.isProcessing = false;
  }

  /**
   * Obtém tamanho da fila
   */
  size(): number {
    return this.queue.length;
  }
}

/**
 * Gerenciador de estados de renderização de sprites
 */
export class SpriteRenderStateManager {
  private states: Map<string, SpriteRenderState> = new Map();

  /**
   * Cria ou atualiza estado de um Pokémon
   */
  setState(pokemonId: number, side: Side, state: Partial<SpriteRenderState>): void {
    const key = `${side}-${pokemonId}`;
    const current = this.states.get(key);

    this.states.set(key, {
      pokemonId,
      side,
      isActive: true,
      isShiny: false,
      currentAnimation: null,
      animationProgress: 0,
      position: { x: 0, y: 0 },
      scale: 1,
      opacity: 1,
      rotation: 0,
      effects: {},
      ...current,
      ...state,
    });
  }

  /**
   * Obtém estado de um Pokémon
   */
  getState(pokemonId: number, side: Side): SpriteRenderState | null {
    const key = `${side}-${pokemonId}`;
    return this.states.get(key) ?? null;
  }

  /**
   * Atualiza apenas animação de um Pokémon
   */
  updateAnimation(
    pokemonId: number,
    side: Side,
    animation: AnimationName | null,
    progress: number,
  ): void {
    const state = this.getState(pokemonId, side);
    if (state) {
      state.currentAnimation = animation;
      state.animationProgress = Math.max(0, Math.min(1, progress));
    }
  }

  /**
   * Atualiza posição
   */
  updatePosition(
    pokemonId: number,
    side: Side,
    x: number,
    y: number,
  ): void {
    const state = this.getState(pokemonId, side);
    if (state) {
      state.position = { x, y };
    }
  }

  /**
   * Atualiza efeitos visuais
   */
  updateEffects(pokemonId: number, side: Side, effects: Partial<SpriteRenderState['effects']>): void {
    const state = this.getState(pokemonId, side);
    if (state) {
      state.effects = { ...state.effects, ...effects };
    }
  }

  /**
   * Remove estado de um Pokémon
   */
  removeState(pokemonId: number, side: Side): void {
    const key = `${side}-${pokemonId}`;
    this.states.delete(key);
  }

  /**
   * Obtém todos os estados de um lado
   */
  getStates(side: Side): SpriteRenderState[] {
    return Array.from(this.states.values()).filter((state) => state.side === side);
  }

  /**
   * Limpa todos os estados
   */
  clear(): void {
    this.states.clear();
  }
}

/**
 * Classe para interpolar valores numéricos
 */
export class NumberInterpolator {
  static easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  static easeInQuad(t: number): number {
    return t * t;
  }

  static linear(t: number): number {
    return t;
  }

  static interpolate(
    from: number,
    to: number,
    progress: number,
    easing: (t: number) => number = NumberInterpolator.linear,
  ): number {
    const easedProgress = easing(Math.max(0, Math.min(1, progress)));
    return from + (to - from) * easedProgress;
  }
}

/**
 * Utilitários para calcular transformações CSS/transform
 */
export class TransformCalculator {
  static shake(intensity: number, phase: number): { x: number; y: number } {
    const angle = phase * Math.PI * 2;
    const distance = Math.sin(phase * 12) * intensity;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  }

  static flash(intensity: number): { opacity: number; filter: string } {
    return {
      opacity: 1 - intensity * 0.5,
      filter: `brightness(${1 + intensity})`,
    };
  }

  static blur(intensity: number): string {
    return `blur(${intensity * 10}px)`;
  }

  static buildTransform(
    translateX: number,
    translateY: number,
    scaleX: number,
    scaleY: number,
    rotation: number,
  ): string {
    return `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY}) rotate(${rotation}deg)`;
  }
}

/**
 * Integração do Sistema de Sprites com Battle-UI
 * EXEMPLO: Como integrar com o código existente
 */

import type { BattleEvent, BattleFighter } from '@/types/battle';
import type { BattleAnimationController } from '@/features/battle/battle-animations';

type SpriteActions = {
  registerPokemon: (pokemonId: number, pokemonName: string) => void;
  spawnSprite: (pokemonId: number, side: 'player' | 'enemy') => void;
  playAttack: (pokemonId: number, side: 'player' | 'enemy', callback?: () => void) => string;
  playDamage: (pokemonId: number, side: 'player' | 'enemy', callback?: () => void) => string;
  playFaint: (pokemonId: number, side: 'player' | 'enemy', callback?: () => void) => string;
  playSwitch: (pokemonId: number, side: 'player' | 'enemy', callback?: () => void) => string;
  start: () => void;
  stop: () => void;
};

/**
 * Wrapper para integrar o novo sistema com o existente
 * Use isso como referência ao modificar battle-ui.tsx
 */
export class BattleSpriteIntegration {
  private sprites: SpriteActions;
  private registeredPokemon: Map<number, boolean> = new Map();

  constructor(sprites: SpriteActions) {
    this.sprites = sprites;
  }

  /**
   * Registra Pokémon antes de usar
   */
  ensurePokemonRegistered(pokemon: BattleFighter): void {
    if (!this.registeredPokemon.get(pokemon.id)) {
      this.sprites.registerPokemon(pokemon.id, pokemon.name);
      this.registeredPokemon.set(pokemon.id, true);
    }
  }

  /**
   * Processa evento de battaglia com animações
   */
  async handleBattleEvent(
    event: BattleEvent,
    player: BattleFighter | null,
    enemy: BattleFighter | null,
    animationController: BattleAnimationController,
  ): Promise<void> {
    const target = event.side === 'player' ? player : enemy;
    if (!target) return;

    this.ensurePokemonRegistered(target);

    switch (event.type) {
      case 'attack':
        if (event.move) {
          const attacker = event.side;
          await new Promise<void>((resolve) => {
            this.sprites.playAttack(target.id, event.side, resolve);
          });
        }
        break;

      case 'damage':
        if (event.nextHp !== undefined) {
          await Promise.all([
            new Promise<void>((resolve) => {
              this.sprites.playDamage(target.id, event.side, resolve);
            }),
            // Mantém animações originais também
            this.animateHPBar(event.side, event.nextHp, animationController),
          ]);
        }
        break;

      case 'status':
        // Status changes podem ter efeitos visuais também
        if (event.nextStatus) {
          // Aqui poderíamos adicionar efeito visual para status
        }
        break;

      case 'switch':
        // Quando troqua de Pokémon
        const newTarget = event.side === 'player' ? player : enemy;
        if (newTarget) {
          this.ensurePokemonRegistered(newTarget);
          await new Promise<void>((resolve) => {
            this.sprites.playSwitch(newTarget.id, event.side, resolve);
          });
        }
        break;
    }
  }

  /**
   * Sincroniza HP visual com sprite state
   */
  private animateHPBar(
    side: 'player' | 'enemy',
    newHP: number,
    controller: BattleAnimationController,
  ): Promise<void> {
    return new Promise((resolve) => {
      // Usa a função original de animação de HP bar
      const from = controller.getDisplayedHp(side);
      const delta = newHP - from;
      const duration = 420;
      const fps = 60;
      const frameTime = 1000 / fps;

      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += frameTime;
        const progress = Math.min(1, elapsed / duration);
        const next = Math.round(from + delta * progress);

        controller.updateDisplayedHp(side, next);

        if (progress >= 1) {
          clearInterval(interval);
          controller.updateDisplayedHp(side, newHP);
          resolve();
        }
      }, frameTime);
    });
  }

  /**
   * Inicializa sprites quando batalha começa
   */
  initializeBattle(player: BattleFighter, enemy: BattleFighter): void {
    this.sprites.registerPokemon(player.id, player.name);
    this.sprites.registerPokemon(enemy.id, enemy.name);

    this.sprites.spawnSprite(player.id, 'player');
    this.sprites.spawnSprite(enemy.id, 'enemy');

    this.sprites.start();
  }

  /**
   * Limpa quando batalha termina
   */
  cleanup(): void {
    this.sprites.stop();
    this.registeredPokemon.clear();
  }

  /**
   * Dispara efeito visual de crítico
   */
  playCriticalHit(targetId: number, side: 'player' | 'enemy'): Promise<void> {
    return new Promise((resolve) => {
      this.sprites.playDamage(targetId, side, resolve);
    });
  }

  /**
   * Dispara efeito visual de status
   */
  playStatusEffect(
    targetId: number,
    side: 'player' | 'enemy',
    status: string,
  ): Promise<void> {
    // Pode disparar uma animação customizada para status
    return new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  /**
   * Dispara efeito visual de derrota
   */
  playDefeatSequence(targetId: number, side: 'player' | 'enemy'): Promise<void> {
    return new Promise((resolve) => {
      this.sprites.playFaint(targetId, side, resolve);
    });
  }
}

/**
 * EXEMPLO: Como usar na battle-ui.tsx
 *
 * import { useSprites } from '@/features/battle/hooks/useSprites';
 * import { BattleSpriteIntegration } from '@/features/battle/sprite-engine/integration';
 *
 * export const BattleView = ({ onViewChange }: BattleViewProps): JSX.Element => {
 *   // ... existing state ...
 *
 *   const spritesHook = useSprites({ autoStart: false });
 *   const spriteIntegration = useRef(new BattleSpriteIntegration(spritesHook));
 *
 *   const processEvent = async (event: BattleEvent): Promise<void> => {
 *     if (event.type === 'log' && event.text) {
 *       pushLog(event.text, event.tone ?? 'neutral');
 *       return;
 *     }
 *
 *     // NOVO: Usar sprite integration
 *     await spriteIntegration.current.handleBattleEvent(
 *       event,
 *       player,
 *       enemy,
 *       animationController,
 *     );
 *   };
 *
 *   const startBattle = async (): Promise<void> => {
 *     // ... existing setup ...
 *
 *     // NOVO: Inicializar sprites
 *     spriteIntegration.current.initializeBattle(leadPlayer, firstEnemy);
 *
 *     // ... rest of the code ...
 *
 *     return () => {
 *       spriteIntegration.current.cleanup();
 *     };
 *   };
 * };
 */

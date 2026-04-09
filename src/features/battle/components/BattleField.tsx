import type { BattleFighter, NonVolatileStatus } from '@/types/battle';
import type { AnimationState } from '../battle-animations';
import { useEffect, useState } from 'react';
import { getPokemonSprite, preloadSprite } from '@/services/spriteService';

interface PokemonSpriteProps {
  src: string;
  fallbackSrc: string;
  pokemonId: number;
  side: 'player' | 'enemy';
  name?: string;
  depth: 'near' | 'far';
  isHit: boolean;
  isShaking: boolean;
  isFading: boolean;
  isLunging: boolean;
}

const randomShake = (): { x: number; y: number } => ({
  x: (Math.random() * 2 - 1) * 6,
  y: (Math.random() * 2 - 1) * 4,
});

const PokemonSprite = ({
  src,
  fallbackSrc,
  pokemonId,
  side,
  name,
  depth,
  isHit,
  isShaking,
  isFading,
  isLunging,
}: PokemonSpriteProps): JSX.Element => {
  const shakeOffset = isShaking ? randomShake() : { x: 0, y: 0 };
  const scale = depth === 'near' ? 1.32 : 0.92;
  const zIndex = depth === 'near' ? 50 : 30;
  const lungeOffset = isLunging ? (side === 'player' ? 28 : -28) : 0;
  const brightness = isHit ? 1.7 : depth === 'far' ? 0.92 : 1;
  const spriteSize = depth === 'near' ? 200 : 150;

  return (
    <div
      className="transition-all duration-100 flex items-center justify-center"
      style={{
        transform: `translate3d(${shakeOffset.x + lungeOffset}px, ${shakeOffset.y}px, 0) scale(${scale})`,
        filter: `brightness(${brightness})`,
        opacity: isFading ? 0.2 : 1,
        zIndex,
        width: spriteSize,
        height: spriteSize,
      }}
    >
      <img
        src={src}
        onError={(event) => {
          event.currentTarget.src = fallbackSrc;
        }}
        alt={name || `Pokemon ${pokemonId}`}
        className={`pokemon-sprite select-none ${side === 'enemy' ? 'scale-x-[-1] enemy-pokemon' : 'player-pokemon'}`}
        style={{ 
          imageRendering: 'crisp-edges',
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

interface BattleFieldProps {
  playerPokemon: BattleFighter | null;
  enemyPokemon: BattleFighter | null;
  playerDisplayedHp: number;
  enemyDisplayedHp: number;
  animationState: AnimationState;
}

const hpPercent = (current: number, max: number): number => Math.max(0, Math.min(100, (current / max) * 100));

const hpColor = (percent: number): string => {
  if (percent <= 25) return '#c23030';
  if (percent <= 50) return '#ca8a04';
  return '#16a34a';
};

const statusLabel = (status: NonVolatileStatus | null): string => {
  if (!status) return 'OK';
  if (status === 'paralysis') return 'PAR';
  if (status === 'poison') return 'PSN';
  if (status === 'burn') return 'BRN';
  return 'SLP';
};

export const BattleField = ({
  playerPokemon,
  enemyPokemon,
  playerDisplayedHp,
  enemyDisplayedHp,
  animationState,
}: BattleFieldProps): JSX.Element => {
  const [playerSprite, setPlayerSprite] = useState<string | null>(null);
  const [enemySprite, setEnemySprite] = useState<string | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!playerPokemon) {
        setPlayerSprite(null);
        return;
      }

      try {
        const sprites = await getPokemonSprite(playerPokemon.name);
        if (!sprites?.back) {
          setPlayerSprite(null);
          return;
        }
        await preloadSprite(sprites.back);
        setPlayerSprite(sprites.back);
      } catch {
        setPlayerSprite(null);
      }
    };

    void load();
  }, [playerPokemon?.name]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!enemyPokemon) {
        setEnemySprite(null);
        return;
      }

      try {
        const sprites = await getPokemonSprite(enemyPokemon.name);
        if (!sprites?.front) {
          setEnemySprite(null);
          return;
        }
        await preloadSprite(sprites.front);
        setEnemySprite(sprites.front);
      } catch {
        setEnemySprite(null);
      }
    };

    void load();
  }, [enemyPokemon?.name]);

  const playerHp = playerPokemon ? hpPercent(playerDisplayedHp, playerPokemon.maxHp) : 0;
  const enemyHp = enemyPokemon ? hpPercent(enemyDisplayedHp, enemyPokemon.maxHp) : 0;

  const projectileTransform = animationState.projectile
    ? animationState.projectile.from === 'player'
      ? 'translate3d(36%, -18%, 0)'
      : 'translate3d(-36%, 18%, 0)'
    : 'translate3d(0, 0, 0)';

  return (
    <section
      className="battlefield relative h-full min-h-[360px] overflow-hidden rounded-2xl border border-[#4f5c53] bg-[radial-gradient(circle_at_70%_20%,#d8eef8_0%,#c5e7da_35%,#a9cfb5_62%,#7f9d84_100%)]"
      style={{
        transform: `translate3d(${animationState.camera.x}px, ${animationState.camera.y}px, 0)`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.28),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,rgba(122,163,114,0)_0%,rgba(98,132,90,0.8)_68%,rgba(72,96,66,0.95)_100%)]" />

      {animationState.impactFlash ? <div className="pointer-events-none absolute inset-0 bg-white/80" /> : null}

      <div className="absolute right-4 top-4 z-30 w-[260px] rounded-lg border border-[#5e6a63] bg-[#f6fbf5]/90 p-3 shadow-lg">
        <div className="flex items-start justify-between gap-2 text-[#27322d]">
          <div>
            <p className="text-sm font-black uppercase">{enemyPokemon?.name ?? 'Enemy'}</p>
            <p className="text-[11px] font-semibold text-[#516156]">Lv {enemyPokemon?.level ?? '--'} • {statusLabel(enemyPokemon?.status ?? null)}</p>
          </div>
          <p className="text-xs font-semibold text-[#34463d]">{Math.max(0, Math.round(enemyDisplayedHp))}/{enemyPokemon?.maxHp ?? 0}</p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-[#d4dfd3]">
          <div className="h-full transition-[width] duration-75" style={{ width: `${enemyHp}%`, backgroundColor: hpColor(enemyHp) }} />
        </div>
      </div>

      <div className="absolute bottom-5 left-4 z-40 w-[280px] rounded-lg border border-[#55635a] bg-[#f6fbf5]/92 p-3 shadow-xl">
        <div className="flex items-start justify-between gap-2 text-[#27322d]">
          <div>
            <p className="text-sm font-black uppercase">{playerPokemon?.name ?? 'Player'}</p>
            <p className="text-[11px] font-semibold text-[#516156]">Lv {playerPokemon?.level ?? '--'} • {statusLabel(playerPokemon?.status ?? null)}</p>
          </div>
          <p className="text-xs font-semibold text-[#34463d]">{Math.max(0, Math.round(playerDisplayedHp))}/{playerPokemon?.maxHp ?? 0}</p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-[#d4dfd3]">
          <div className="h-full transition-[width] duration-75" style={{ width: `${playerHp}%`, backgroundColor: hpColor(playerHp) }} />
        </div>
      </div>

      <div className="absolute inset-0 z-10">
        <div className="absolute right-[18%] top-[14%]">
          {enemyPokemon ? (
            <PokemonSprite
              src={enemySprite ?? enemyPokemon.sprite}
              fallbackSrc={enemyPokemon.sprite}
              pokemonId={enemyPokemon.id}
              side="enemy"
              name={enemyPokemon.name}
              isHit={animationState.hitSide === 'enemy'}
              isShaking={animationState.shakingSide === 'enemy'}
              isFading={animationState.fadingSide === 'enemy'}
              isLunging={animationState.lungingSide === 'enemy'}
              depth="far"
            />
          ) : null}
        </div>

        <div className="absolute bottom-[9%] left-[10%]">
          {playerPokemon ? (
            <PokemonSprite
              src={playerSprite ?? playerPokemon.sprite}
              fallbackSrc={playerPokemon.sprite}
              pokemonId={playerPokemon.id}
              side="player"
              name={playerPokemon.name}
              isHit={animationState.hitSide === 'player'}
              isShaking={animationState.shakingSide === 'player'}
              isFading={animationState.fadingSide === 'player'}
              isLunging={animationState.lungingSide === 'player'}
              depth="near"
            />
          ) : null}
        </div>
      </div>

      {animationState.projectile ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-50 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white/70 shadow-[0_0_26px_5px_rgba(255,255,255,0.72)] transition-transform duration-150"
          style={{ transform: `${projectileTransform}` }}
        />
      ) : null}

      {animationState.hitStop ? <div className="pointer-events-none absolute inset-0 z-[70] bg-black/5" /> : null}
    </section>
  );
};

import { useMemo } from 'react';

interface PokemonSpriteProps {
  src: string;
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

export const PokemonSprite = ({
  src,
  pokemonId,
  side,
  name,
  depth,
  isHit,
  isShaking,
  isFading,
  isLunging,
}: PokemonSpriteProps): JSX.Element => {
  const shakeOffset = useMemo(() => (isShaking ? randomShake() : { x: 0, y: 0 }), [isShaking]);

  const scale = depth === 'near' ? 1.32 : 0.92;
  const zIndex = depth === 'near' ? 50 : 30;
  const lungeOffset = isLunging ? (side === 'player' ? 28 : -28) : 0;
  const brightness = isHit ? 1.7 : depth === 'far' ? 0.92 : 1;

  return (
    <div
      className="transition-all duration-100"
      style={{
        transform: `translate3d(${shakeOffset.x + lungeOffset}px, ${shakeOffset.y}px, 0) scale(${scale})`,
        filter: `brightness(${brightness})`,
        opacity: isFading ? 0.2 : 1,
        zIndex,
      }}
    >
      <img
        src={src}
        alt={name || `Pokemon ${pokemonId}`}
        width={depth === 'near' ? 210 : 160}
        height={depth === 'near' ? 210 : 160}
        className={`select-none object-contain ${side === 'enemy' ? 'scale-x-[-1]' : ''}`}
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

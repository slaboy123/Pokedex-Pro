import type { BattleFighter, BattleMove } from '@/types/battle';

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, dark: 0.5, normal: 0 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
};

export const calculateTypeMultiplier = (attackType: string, defenseTypes: string[]): number => {
  return defenseTypes.reduce((multiplier, defenseType) => {
    const specific = TYPE_CHART[attackType]?.[defenseType];
    if (specific === undefined) {
      return multiplier;
    }
    return multiplier * specific;
  }, 1);
};

export const calculateDamage = (attacker: BattleFighter, defender: BattleFighter, move: BattleMove): { damage: number; critical: boolean; multiplier: number } => {
  const attackStat = attacker.attack;
  const defenseStat = Math.max(1, defender.defense);
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const multiplier = calculateTypeMultiplier(move.type, defender.types);
  const critical = Math.random() < 0.12;
  const crit = critical ? 1.5 : 1;
  const levelFactor = ((2 * attacker.level) / 5) + 2;
  const power = Math.max(1, move.power);
  const raw = (((levelFactor * power * (attackStat / defenseStat)) / 50) + 2) * stab * multiplier * crit;
  const randomFactor = 0.85 + Math.random() * 0.15;
  return {
    damage: Math.max(1, Math.floor(raw * randomFactor)),
    critical,
    multiplier,
  };
};

export const formatEffectivenessLabel = (multiplier: number): string => {
  if (multiplier === 0) return 'imune';
  if (multiplier < 1) return 'resiste';
  if (multiplier > 1) return 'super efetivo';
  return 'normal';
};
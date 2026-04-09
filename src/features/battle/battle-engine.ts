import type { BattleAction, BattleEvent, BattleFighter, BattleMove, BattleSideState } from '@/types/battle';
import { calculateTypeMultiplier } from '@/utils/damage';

interface TurnResolution {
  queue: BattleEvent[];
  nextPlayerSide: BattleSideState;
  nextEnemySide: BattleSideState;
  nextRound: number;
  winner: 'player' | 'enemy' | null;
}

interface DamageOutcome {
  damage: number;
  multiplier: number;
  critical: boolean;
}

interface ActionOrderEntry {
  side: 'player' | 'enemy';
  action: BattleAction;
  speed: number;
  priority: number;
}

const nextId = (): string => crypto.randomUUID();

const cloneSide = (side: BattleSideState): BattleSideState => ({
  roster: side.roster.map((fighter) => ({ ...fighter, moves: [...fighter.moves] })),
  activeIndex: side.activeIndex,
});

const getActive = (side: BattleSideState): BattleFighter => side.roster[side.activeIndex] ?? side.roster[0];

const setActive = (side: BattleSideState, fighter: BattleFighter): void => {
  side.roster[side.activeIndex] = fighter;
};

const isAlive = (fighter: BattleFighter | undefined): fighter is BattleFighter => Boolean(fighter && fighter.currentHp > 0);

const hasAlive = (side: BattleSideState): boolean => side.roster.some((fighter) => fighter.currentHp > 0);

const findNextAliveIndex = (side: BattleSideState): number => {
  return side.roster.findIndex((fighter, index) => index !== side.activeIndex && fighter.currentHp > 0);
};

const effectiveSpeed = (fighter: BattleFighter): number => {
  if (fighter.status === 'paralysis') {
    return Math.floor(fighter.speed * 0.25);
  }
  return fighter.speed;
};

const effectiveAttack = (fighter: BattleFighter, move: BattleMove): number => {
  if (move.category === 'special') {
    return fighter.specialAttack;
  }
  if (fighter.status === 'burn') {
    return Math.floor(fighter.attack * 0.5);
  }
  return fighter.attack;
};

const effectiveDefense = (fighter: BattleFighter, move: BattleMove): number => {
  if (move.category === 'special') {
    return Math.max(1, fighter.specialDefense);
  }
  return Math.max(1, fighter.defense);
};

const rollCritical = (): boolean => Math.random() < 0.0625;
const rollAccuracy = (accuracy: number): boolean => (Math.random() * 100) <= Math.max(1, accuracy);

const calculateDamage = (attacker: BattleFighter, defender: BattleFighter, move: BattleMove): DamageOutcome => {
  const multiplier = calculateTypeMultiplier(move.type, defender.types);
  if (move.category === 'status' || move.power <= 0 || multiplier === 0) {
    return { damage: 0, multiplier, critical: false };
  }

  const atk = Math.max(1, effectiveAttack(attacker, move));
  const def = Math.max(1, effectiveDefense(defender, move));
  const level = attacker.level;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const critical = rollCritical();
  const crit = critical ? 1.5 : 1;
  const random = 0.85 + (Math.random() * 0.15);
  const baseDamage = ((((2 * level) / 5 + 2) * Math.max(1, move.power) * (atk / def)) / 50) + 2;

  return {
    damage: Math.max(1, Math.floor(baseDamage * stab * multiplier * crit * random)),
    multiplier,
    critical,
  };
};

const createLogEvent = (batchId: string, side: 'player' | 'enemy', text: string, tone: BattleEvent['tone'] = 'neutral'): BattleEvent => ({
  id: nextId(),
  batchId,
  type: 'log',
  side,
  text,
  tone,
});

const canAct = (fighter: BattleFighter): { allowed: boolean; reason?: string; fighter: BattleFighter } => {
  if (fighter.status === 'sleep') {
    if (fighter.sleepTurns <= 0) {
      return { allowed: true, fighter: { ...fighter, status: null } };
    }

    return {
      allowed: false,
      reason: `${fighter.name} está dormindo.`,
      fighter: { ...fighter, sleepTurns: fighter.sleepTurns - 1 },
    };
  }

  if (fighter.status === 'paralysis' && Math.random() < 0.25) {
    return { allowed: false, reason: `${fighter.name} está paralisado!`, fighter };
  }

  return { allowed: true, fighter };
};

const applyStatusDamage = (sideName: 'player' | 'enemy', side: BattleSideState): BattleEvent[] => {
  const active = getActive(side);
  if (active.currentHp <= 0 || (active.status !== 'burn' && active.status !== 'poison')) {
    return [];
  }

  const batchId = nextId();
  const statusDamage = Math.max(1, Math.floor(active.maxHp / 8));
  const nextHp = Math.max(0, active.currentHp - statusDamage);
  const nextFighter = { ...active, currentHp: nextHp };
  setActive(side, nextFighter);

  const events: BattleEvent[] = [
    createLogEvent(batchId, sideName, `${active.name} sofreu dano de ${active.status}!`, 'warning'),
    {
      id: nextId(),
      batchId,
      type: 'damage',
      side: sideName,
      damage: statusDamage,
      nextHp,
      effectiveness: 1,
      critical: false,
    },
  ];

  if (nextHp <= 0) {
    events.push(createLogEvent(batchId, sideName, `${active.name} desmaiou!`, 'danger'));
  }

  return events;
};

const resolveAttack = (
  sideName: 'player' | 'enemy',
  attackingSide: BattleSideState,
  defendingSide: BattleSideState,
  moveIndex: number,
): BattleEvent[] => {
  const batchId = nextId();
  const attacker = getActive(attackingSide);
  const defender = getActive(defendingSide);
  const move = attacker.moves[moveIndex] ?? attacker.moves[0];

  const events: BattleEvent[] = [
    {
      id: nextId(),
      batchId,
      type: 'attack',
      side: sideName,
      move,
    },
    createLogEvent(batchId, sideName, `${attacker.name} usou ${move.name}!`),
  ];

  if (!rollAccuracy(move.accuracy)) {
    events.push(createLogEvent(batchId, sideName, 'Mas errou o ataque!', 'warning'));
    return events;
  }

  const outcome = calculateDamage(attacker, defender, move);

  if (outcome.multiplier === 0) {
    events.push(createLogEvent(batchId, sideName, `${defender.name} é imune!`, 'warning'));
    return events;
  }

  if (outcome.damage > 0) {
    const nextHp = Math.max(0, defender.currentHp - outcome.damage);
    setActive(defendingSide, { ...defender, currentHp: nextHp });

    events.push({
      id: nextId(),
      batchId,
      type: 'damage',
      side: sideName === 'player' ? 'enemy' : 'player',
      move,
      damage: outcome.damage,
      nextHp,
      effectiveness: outcome.multiplier,
      critical: outcome.critical,
    });

    if (outcome.multiplier > 1) {
      events.push(createLogEvent(batchId, sideName, 'É super efetivo!', 'success'));
    } else if (outcome.multiplier < 1) {
      events.push(createLogEvent(batchId, sideName, 'Não foi muito efetivo...', 'warning'));
    }

    if (outcome.critical) {
      events.push(createLogEvent(batchId, sideName, 'Acerto crítico!', 'success'));
    }

    if (nextHp <= 0) {
      events.push(createLogEvent(batchId, sideName, `${defender.name} desmaiou!`, 'danger'));
      return events;
    }
  }

  if (move.inflictsStatus && defender.status === null) {
    const chance = move.inflictChance ?? 0;
    if (Math.random() <= chance) {
      const appliedStatus = move.inflictsStatus;
      const statusTarget = {
        ...getActive(defendingSide),
        status: appliedStatus,
        sleepTurns: appliedStatus === 'sleep' ? 2 + Math.floor(Math.random() * 2) : 0,
      };
      setActive(defendingSide, statusTarget);
      events.push({
        id: nextId(),
        batchId,
        type: 'status',
        side: sideName === 'player' ? 'enemy' : 'player',
        nextStatus: appliedStatus,
      });
      events.push(createLogEvent(batchId, sideName, `${defender.name} ficou com status ${appliedStatus}!`, 'warning'));
    }
  }

  return events;
};

const resolveSwitch = (
  sideName: 'player' | 'enemy',
  side: BattleSideState,
  targetIndex: number,
): BattleEvent[] => {
  const current = getActive(side);
  const target = side.roster[targetIndex];
  const batchId = nextId();

  if (!target || targetIndex === side.activeIndex || target.currentHp <= 0) {
    return [createLogEvent(batchId, sideName, `${current.name} não pode trocar agora.`, 'warning')];
  }

  side.activeIndex = targetIndex;

  return [
    {
      id: nextId(),
      batchId,
      type: 'switch',
      side: sideName,
    },
    createLogEvent(batchId, sideName, `${current.name}, volte!`, 'neutral'),
    createLogEvent(batchId, sideName, `${target.name}, eu escolho você!`, 'neutral'),
  ];
};

const forceSwitchIfFainted = (sideName: 'player' | 'enemy', side: BattleSideState): BattleEvent[] => {
  const active = getActive(side);
  if (active.currentHp > 0) {
    return [];
  }

  const nextIndex = findNextAliveIndex(side);
  if (nextIndex < 0) {
    return [];
  }

  const nextFighter = side.roster[nextIndex];
  side.activeIndex = nextIndex;
  const batchId = nextId();

  return [
    {
      id: nextId(),
      batchId,
      type: 'switch',
      side: sideName,
    },
    createLogEvent(batchId, sideName, `${nextFighter.name} entrou em campo!`, 'warning'),
  ];
};

const actionPriority = (entry: { action: BattleAction; fighter: BattleFighter }): number => {
  if (entry.action.type === 'switch') {
    return 6;
  }
  const move = entry.fighter.moves[entry.action.moveIndex] ?? entry.fighter.moves[0];
  return move.priority;
};

const chooseEnemyAction = (enemySide: BattleSideState): BattleAction => {
  const active = getActive(enemySide);
  const lowHp = active.currentHp / active.maxHp <= 0.22;

  if (lowHp) {
    const candidateIndex = enemySide.roster.findIndex((fighter, index) => index !== enemySide.activeIndex && fighter.currentHp > 0);
    if (candidateIndex >= 0 && Math.random() < 0.3) {
      return { type: 'switch', targetIndex: candidateIndex };
    }
  }

  let bestMoveIndex = 0;
  let bestPower = -1;
  active.moves.forEach((move, index) => {
    const score = (move.power || 1) * (move.accuracy / 100);
    if (score > bestPower) {
      bestPower = score;
      bestMoveIndex = index;
    }
  });

  return { type: 'fight', moveIndex: bestMoveIndex };
};

export const resolveTurn = (
  playerSideState: BattleSideState,
  enemySideState: BattleSideState,
  playerAction: BattleAction,
  round: number,
): TurnResolution => {
  const nextPlayerSide = cloneSide(playerSideState);
  const nextEnemySide = cloneSide(enemySideState);
  const queue: BattleEvent[] = [createLogEvent(nextId(), 'player', `Turno ${round}`)];

  if (!hasAlive(nextPlayerSide)) {
    return { queue, nextPlayerSide, nextEnemySide, nextRound: round, winner: 'enemy' };
  }
  if (!hasAlive(nextEnemySide)) {
    return { queue, nextPlayerSide, nextEnemySide, nextRound: round, winner: 'player' };
  }

  const enemyAction = chooseEnemyAction(nextEnemySide);

  const order: ActionOrderEntry[] = [
    {
      side: 'player' as const,
      action: playerAction,
      speed: effectiveSpeed(getActive(nextPlayerSide)),
      priority: actionPriority({ action: playerAction, fighter: getActive(nextPlayerSide) }),
    },
    {
      side: 'enemy' as const,
      action: enemyAction,
      speed: effectiveSpeed(getActive(nextEnemySide)),
      priority: actionPriority({ action: enemyAction, fighter: getActive(nextEnemySide) }),
    },
  ].sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }
    if (left.speed !== right.speed) {
      return right.speed - left.speed;
    }
    return Math.random() > 0.5 ? 1 : -1;
  });

  for (const action of order) {
    const actingSide = action.side === 'player' ? nextPlayerSide : nextEnemySide;
    const defendingSide = action.side === 'player' ? nextEnemySide : nextPlayerSide;

    if (action.action.type === 'switch') {
      queue.push(...resolveSwitch(action.side, actingSide, action.action.targetIndex));
      continue;
    }

    if (!isAlive(getActive(actingSide)) || !isAlive(getActive(defendingSide))) {
      continue;
    }

    const gate = canAct(getActive(actingSide));
    setActive(actingSide, gate.fighter);

    if (!gate.allowed) {
      queue.push(createLogEvent(nextId(), action.side, gate.reason ?? `${gate.fighter.name} não conseguiu agir.`, 'warning'));
      continue;
    }

    queue.push(...resolveAttack(action.side, actingSide, defendingSide, action.action.moveIndex));
  }

  queue.push(...applyStatusDamage('player', nextPlayerSide));
  queue.push(...applyStatusDamage('enemy', nextEnemySide));

  // If an active Pokémon faints and the side still has reserves, switch immediately.
  queue.push(...forceSwitchIfFainted('player', nextPlayerSide));
  queue.push(...forceSwitchIfFainted('enemy', nextEnemySide));

  const winner = !hasAlive(nextPlayerSide) ? 'enemy' : !hasAlive(nextEnemySide) ? 'player' : null;

  return {
    queue,
    nextPlayerSide,
    nextEnemySide,
    nextRound: winner ? round : round + 1,
    winner,
  };
};

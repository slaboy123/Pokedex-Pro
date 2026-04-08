import type { BattleEvent, BattleFighter, BattleMove, NonVolatileStatus } from '@/types/battle';
import { calculateTypeMultiplier } from '@/utils/damage';

interface TurnResolution {
  queue: BattleEvent[];
  nextPlayer: BattleFighter;
  nextEnemy: BattleFighter;
  nextRound: number;
  winner: 'player' | 'enemy' | null;
}

interface ActionContext {
  side: 'player' | 'enemy';
  move: BattleMove;
  attacker: BattleFighter;
  defender: BattleFighter;
}

const nextId = (): string => crypto.randomUUID();

const effectiveSpeed = (fighter: BattleFighter): number => {
  if (fighter.status === 'paralysis') {
    return Math.floor(fighter.speed * 0.25);
  }
  return fighter.speed;
};

const effectiveAttack = (fighter: BattleFighter, move: BattleMove): number => {
  const category = move.category ?? 'physical';
  if (category === 'special') {
    return fighter.specialAttack;
  }
  if (fighter.status === 'burn') {
    return Math.floor(fighter.attack * 0.5);
  }
  return fighter.attack;
};

const effectiveDefense = (fighter: BattleFighter, move: BattleMove): number => {
  const category = move.category ?? 'physical';
  if (category === 'special') {
    return Math.max(1, fighter.specialDefense);
  }
  return Math.max(1, fighter.defense);
};

const rollCritical = (): boolean => Math.random() < 0.1;

const rollAccuracy = (accuracy: number): boolean => (Math.random() * 100) <= accuracy;

const calculateEmeraldDamage = (attacker: BattleFighter, defender: BattleFighter, move: BattleMove): { damage: number; multiplier: number; critical: boolean } => {
  const power = Math.max(1, move.power);
  const atk = effectiveAttack(attacker, move);
  const def = effectiveDefense(defender, move);
  const level = attacker.level;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const multiplier = calculateTypeMultiplier(move.type, defender.types);
  const critical = rollCritical();
  const crit = critical ? 1.5 : 1;
  const random = 0.85 + (Math.random() * 0.15);

  const baseDamage = ((((2 * level) / 5 + 2) * power * (atk / def)) / 50) + 2;
  const total = Math.floor(baseDamage * stab * multiplier * crit * random);

  return {
    damage: Math.max(1, total),
    multiplier,
    critical,
  };
};

const estimateMoveDamage = (attacker: BattleFighter, defender: BattleFighter, move: BattleMove): number => {
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const multiplier = calculateTypeMultiplier(move.type, defender.types);
  const attack = effectiveAttack(attacker, move);
  const defense = effectiveDefense(defender, move);
  const expectedRandom = 0.925;
  const expectedCrit = 1.05;
  const baseDamage = ((((2 * attacker.level) / 5 + 2) * Math.max(1, move.power) * (attack / defense)) / 50) + 2;
  return baseDamage * stab * multiplier * expectedRandom * expectedCrit * (move.accuracy / 100);
};

export const chooseBestMoveIndex = (attacker: BattleFighter, defender: BattleFighter): number => {
  let bestIndex = 0;
  let bestScore = -1;

  attacker.moves.forEach((move, index) => {
    const score = estimateMoveDamage(attacker, defender, move);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
};

const createLogEvent = (batchId: string, side: 'player' | 'enemy', text: string, tone: BattleEvent['tone'] = 'neutral'): BattleEvent => ({
  id: nextId(),
  batchId,
  type: 'log',
  side,
  text,
  tone,
});

const createAttackBatch = (
  context: ActionContext,
  attackerName: string,
  defenderName: string,
  setAttacker: (fighter: BattleFighter) => void,
  setDefender: (fighter: BattleFighter) => void,
): BattleEvent[] => {
  const batchId = nextId();
  const events: BattleEvent[] = [];

  if (!rollAccuracy(context.move.accuracy)) {
    events.push({ id: nextId(), batchId, type: 'attack', side: context.side, move: context.move });
    events.push(createLogEvent(batchId, context.side, `${attackerName} usou ${context.move.name}!`));
    events.push(createLogEvent(batchId, context.side, `Mas errou o ataque!`, 'warning'));
    return events;
  }

  const outcome = calculateEmeraldDamage(context.attacker, context.defender, context.move);
  const nextHp = Math.max(0, context.defender.currentHp - outcome.damage);

  setDefender({ ...context.defender, currentHp: nextHp });

  events.push({ id: nextId(), batchId, type: 'attack', side: context.side, move: context.move });
  events.push(createLogEvent(batchId, context.side, `${attackerName} usou ${context.move.name}!`));
  events.push({
    id: nextId(),
    batchId,
    type: 'damage',
    side: context.side === 'player' ? 'enemy' : 'player',
    move: context.move,
    damage: outcome.damage,
    nextHp,
  });

  if (outcome.multiplier > 1) {
    events.push(createLogEvent(batchId, context.side, 'E super efetivo!', 'success'));
  } else if (outcome.multiplier > 0 && outcome.multiplier < 1) {
    events.push(createLogEvent(batchId, context.side, 'Nao foi muito efetivo...', 'warning'));
  } else if (outcome.multiplier === 0) {
    events.push(createLogEvent(batchId, context.side, `${defenderName} e imune!`, 'warning'));
  }

  if (outcome.critical) {
    events.push(createLogEvent(batchId, context.side, 'Acerto critico!', 'success'));
  }

  if (nextHp <= 0) {
    events.push(createLogEvent(batchId, context.side, `${defenderName} desmaiou!`, 'danger'));
    return events;
  }

  if (context.move.inflictsStatus && context.defender.status === null) {
    const chance = context.move.inflictChance ?? 0;
    if (Math.random() <= chance) {
      const appliedStatus = context.move.inflictsStatus;
      const defenderNext = { ...context.defender, status: appliedStatus, sleepTurns: appliedStatus === 'sleep' ? 2 + Math.floor(Math.random() * 2) : 0 };
      setDefender(defenderNext);
      events.push({
        id: nextId(),
        batchId,
        type: 'status',
        side: context.side === 'player' ? 'enemy' : 'player',
        nextStatus: appliedStatus,
      });
      events.push(createLogEvent(batchId, context.side, `${defenderName} ficou com status ${appliedStatus}!`, 'warning'));
    }
  }

  setAttacker(context.attacker);
  return events;
};

const canAct = (fighter: BattleFighter): { allowed: boolean; reason?: string; fighter: BattleFighter } => {
  if (fighter.status === 'sleep') {
    if (fighter.sleepTurns <= 0) {
      return { allowed: true, fighter: { ...fighter, status: null } };
    }

    const next = { ...fighter, sleepTurns: fighter.sleepTurns - 1 };
    return { allowed: false, reason: `${fighter.name} esta dormindo.`, fighter: next };
  }

  if (fighter.status === 'paralysis' && Math.random() < 0.25) {
    return { allowed: false, reason: `${fighter.name} esta paralisado!`, fighter };
  }

  return { allowed: true, fighter };
};

const applyEndTurnStatus = (side: 'player' | 'enemy', fighter: BattleFighter): { fighter: BattleFighter; events: BattleEvent[] } => {
  if (fighter.currentHp <= 0) {
    return { fighter, events: [] };
  }

  const statusBatchId = nextId();
  const events: BattleEvent[] = [];

  if (fighter.status === 'burn' || fighter.status === 'poison') {
    const damage = Math.max(1, Math.floor(fighter.maxHp / 8));
    const nextHp = Math.max(0, fighter.currentHp - damage);
    const updated = { ...fighter, currentHp: nextHp };

    events.push(createLogEvent(statusBatchId, side, `${fighter.name} sofreu dano de ${fighter.status}!`, 'warning'));
    events.push({ id: nextId(), batchId: statusBatchId, type: 'damage', side, damage, nextHp });

    if (nextHp <= 0) {
      events.push(createLogEvent(statusBatchId, side, `${fighter.name} desmaiou!`, 'danger'));
    }

    return { fighter: updated, events };
  }

  return { fighter, events };
};

export const resolveTurn = (player: BattleFighter, enemy: BattleFighter, playerMoveIndex: number, round: number): TurnResolution => {
  let nextPlayer = { ...player };
  let nextEnemy = { ...enemy };
  const queue: BattleEvent[] = [];

  const enemyMoveIndex = chooseBestMoveIndex(nextEnemy, nextPlayer);
  const playerMove = nextPlayer.moves[playerMoveIndex] ?? nextPlayer.moves[0];
  const enemyMove = nextEnemy.moves[enemyMoveIndex] ?? nextEnemy.moves[0];

  const actionOrder: Array<{ side: 'player' | 'enemy'; speed: number; move: BattleMove }> = [
    { side: 'player' as const, speed: effectiveSpeed(nextPlayer), move: playerMove },
    { side: 'enemy' as const, speed: effectiveSpeed(nextEnemy), move: enemyMove },
  ].sort((a, b) => {
    if (a.move.priority !== b.move.priority) {
      return b.move.priority - a.move.priority;
    }
    if (a.speed !== b.speed) {
      return b.speed - a.speed;
    }
    return Math.random() > 0.5 ? 1 : -1;
  });

  queue.push(createLogEvent(nextId(), 'player', `Turno ${round}`));

  for (const action of actionOrder) {
    if (nextPlayer.currentHp <= 0 || nextEnemy.currentHp <= 0) {
      break;
    }

    const actingSide = action.side;
    const attacker = actingSide === 'player' ? nextPlayer : nextEnemy;
    const defender = actingSide === 'player' ? nextEnemy : nextPlayer;

    const gate = canAct(attacker);
    if (actingSide === 'player') {
      nextPlayer = gate.fighter;
    } else {
      nextEnemy = gate.fighter;
    }

    if (!gate.allowed) {
      queue.push(createLogEvent(nextId(), actingSide, gate.reason ?? `${attacker.name} nao conseguiu agir.`, 'warning'));
      continue;
    }

    const actionEvents = createAttackBatch(
      {
        side: actingSide,
        move: action.move,
        attacker: gate.fighter,
        defender,
      },
      attacker.name,
      defender.name,
      (updated) => {
        if (actingSide === 'player') {
          nextPlayer = updated;
        } else {
          nextEnemy = updated;
        }
      },
      (updated) => {
        if (actingSide === 'player') {
          nextEnemy = updated;
        } else {
          nextPlayer = updated;
        }
      },
    );

    queue.push(...actionEvents);
  }

  const playerEnd = applyEndTurnStatus('player', nextPlayer);
  const enemyEnd = applyEndTurnStatus('enemy', nextEnemy);
  nextPlayer = playerEnd.fighter;
  nextEnemy = enemyEnd.fighter;
  queue.push(...playerEnd.events, ...enemyEnd.events);

  const winner = nextPlayer.currentHp <= 0 ? 'enemy' : nextEnemy.currentHp <= 0 ? 'player' : null;

  return {
    queue,
    nextPlayer,
    nextEnemy,
    nextRound: winner ? round : round + 1,
    winner,
  };
};

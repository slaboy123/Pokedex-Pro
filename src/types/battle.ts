import type { PokemonSummary } from './pokemon';

export type MoveCategory = 'physical' | 'special' | 'status';
export type NonVolatileStatus = 'burn' | 'poison' | 'paralysis' | 'sleep';

export interface BattleMove {
  name: string;
  type: string;
  category?: MoveCategory;
  power: number;
  accuracy: number;
  priority: number;
  effect: string;
  inflictsStatus?: NonVolatileStatus;
  inflictChance?: number;
}

export interface BattleFighter extends PokemonSummary {
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  level: number;
  moves: BattleMove[];
  status: NonVolatileStatus | null;
  sleepTurns: number;
}

export type BattlePhase = 'idle' | 'preparing' | 'player-turn' | 'enemy-turn' | 'won' | 'lost';

export interface BattleLogEntry {
  id: string;
  text: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface BattleState {
  phase: BattlePhase;
  player: BattleFighter | null;
  enemy: BattleFighter | null;
  log: BattleLogEntry[];
  round: number;
  xp: number;
}

export interface BattleSnapshot {
  player: BattleFighter | null;
  enemy: BattleFighter | null;
  log: BattleLogEntry[];
  round: number;
  xp: number;
  phase: BattlePhase;
}

export type BattleEventType = 'attack' | 'damage' | 'status' | 'log' | 'switch';

export interface BattleEvent {
  id: string;
  batchId: string;
  type: BattleEventType;
  side: 'player' | 'enemy';
  text?: string;
  move?: BattleMove;
  damage?: number;
  nextHp?: number;
  nextStatus?: NonVolatileStatus | null;
  tone?: BattleLogEntry['tone'];
}
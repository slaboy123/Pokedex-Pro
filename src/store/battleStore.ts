import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BattleFighter, BattleLogEntry, BattlePhase } from '@/types/battle';

interface BattleState {
  phase: BattlePhase;
  player: BattleFighter | null;
  enemy: BattleFighter | null;
  log: BattleLogEntry[];
  round: number;
  xp: number;
  setBattle: (payload: Partial<Omit<BattleState, 'setBattle' | 'resetBattle' | 'pushLog' | 'awardXp'>>) => void;
  pushLog: (entry: Omit<BattleLogEntry, 'id'>) => void;
  updateFighterHp: (fighter: 'player' | 'enemy', nextHp: number) => void;
  setPhase: (phase: BattlePhase) => void;
  advanceRound: () => void;
  awardXp: (amount: number) => void;
  resetBattle: () => void;
}

const INITIAL_STATE = {
  phase: 'idle' as BattlePhase,
  player: null,
  enemy: null,
  log: [] as BattleLogEntry[],
  round: 1,
  xp: 0,
};

export const useBattleStore = create<BattleState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setBattle: (payload) => set((state) => ({ ...state, ...payload })),
      pushLog: (entry) =>
        set((state) => ({
          log: [...state.log, { ...entry, id: crypto.randomUUID() }].slice(-8),
        })),
      updateFighterHp: (fighter, nextHp) =>
        set((state) => {
          if (fighter === 'player' && state.player) {
            return { player: { ...state.player, currentHp: Math.max(0, nextHp) } };
          }
          if (fighter === 'enemy' && state.enemy) {
            return { enemy: { ...state.enemy, currentHp: Math.max(0, nextHp) } };
          }
          return state;
        }),
      setPhase: (phase) => set({ phase }),
      advanceRound: () => set((state) => ({ round: state.round + 1 })),
      awardXp: (amount) => set((state) => ({ xp: state.xp + amount })),
      resetBattle: () =>
        set((state) => ({
          ...INITIAL_STATE,
          xp: state.xp,
        })),
    }),
    {
      name: 'pokedex-pro-battle',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
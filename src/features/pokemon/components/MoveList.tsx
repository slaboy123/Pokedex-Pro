import type { BattleMove } from '@/types/battle';

interface MoveListProps {
  moves: BattleMove[];
}

export const MoveList = ({ moves }: MoveListProps): JSX.Element => {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {moves.map((move) => (
        <div key={move.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-white">{move.name}</p>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80">{move.type}</span>
          </div>
          <p className="mt-2 text-sm text-white/70">{move.effect}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/60">
            <span>Power {move.power}</span>
            <span>Accuracy {move.accuracy}</span>
            <span>Priority {move.priority}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
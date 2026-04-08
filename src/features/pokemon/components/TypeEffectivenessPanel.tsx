import type { TypeEffectiveness } from '@/types/pokemon';
import { TypeBadge } from './TypeBadge';

interface TypeEffectivenessPanelProps {
  effectiveness: TypeEffectiveness;
}

const renderList = (items: string[], emptyLabel: string): JSX.Element => {
  if (items.length === 0) {
    return <span className="text-sm text-white/50">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((type) => (
        <TypeBadge key={type} type={type} />
      ))}
    </div>
  );
};

export const TypeEffectivenessPanel = ({ effectiveness }: TypeEffectivenessPanelProps): JSX.Element => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-rose-300">Weaknesses</p>
        {renderList(effectiveness.weaknesses, 'Nenhuma fraqueza identificada.')}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Resistances</p>
        {renderList(effectiveness.resistances, 'Sem resistências.')}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Immunities</p>
        {renderList(effectiveness.immunities, 'Sem imunidades.')}
      </div>
    </div>
  );
};
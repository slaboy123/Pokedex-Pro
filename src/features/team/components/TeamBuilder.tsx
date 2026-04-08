import { useMemo } from 'react';
import { useTeamStore } from '@/store/teamStore';
import { getTypeColor, capitalize } from '@/utils/pokemon';
import { useToastStore } from '@/store/toastStore';

export const TeamBuilder = (): JSX.Element => {
  const members = useTeamStore((state) => state.members);
  const clearTeam = useTeamStore((state) => state.clearTeam);
  const removeMember = useTeamStore((state) => state.removeMember);
  const pushToast = useToastStore((state) => state.pushToast);

  const typeCoverage = useMemo(() => {
    const coverage = new Set<string>();
    members.forEach((member) => member.types.forEach((type) => coverage.add(type)));
    return [...coverage];
  }, [members]);

  const weaknessSummary = useMemo(() => {
    const buckets = new Map<string, number>();
    members.forEach((member) => {
      member.types.forEach((type) => {
        buckets.set(type, (buckets.get(type) ?? 0) + 1);
      });
    });
    return [...buckets.entries()].sort((left, right) => right[1] - left[1]);
  }, [members]);

  return (
    <div className="space-y-6">
      <section className="rpg-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="rpg-tag">Team Builder</p>
            <h1 className="mt-2 text-3xl font-black text-[#f8edd7]">Companhia de Batalha</h1>
            <p className="mt-2 text-sm text-[#dcc79f]">Adicione criaturas da Pokedex para montar um grupo equilibrado.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearTeam();
              pushToast({ title: 'Team', message: 'Time limpo.', tone: 'info' });
            }}
            className="rounded-full border border-neon-green/35 bg-black/20 px-4 py-2 text-sm font-bold text-[#f6ebd3] transition hover:border-neon-green/70 hover:bg-black/35"
          >
            Clear team
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <section className="rpg-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[#f8edd7]">Selected Pokemon</h2>
            <span className="rounded-full border border-neon-green/30 bg-black/25 px-3 py-1 text-sm font-semibold text-[#dcc79f]">
              {members.length}/6
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {members.length > 0 ? members.map((member) => (
              <article key={member.id} className="rounded-3xl border border-neon-green/25 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#a7926d]">{member.mainType}</p>
                    <h3 className="mt-1 text-lg font-bold text-[#f8edd7]">{member.name}</h3>
                  </div>
                  <button type="button" className="text-xs font-semibold text-rose-300" onClick={() => removeMember(member.id)}>
                    Remove
                  </button>
                </div>
                <img src={member.sprite} alt={member.name} className="mx-auto my-4 h-28 w-28 object-contain" />
                <div className="flex flex-wrap gap-2">
                  {member.types.map((type) => (
                    <span key={type} className="rounded-full px-2.5 py-1 text-xs font-bold text-slate-950" style={{ backgroundColor: getTypeColor(type) }}>
                      {capitalize(type)}
                    </span>
                  ))}
                </div>
              </article>
            )) : (
              <div className="rounded-3xl border border-dashed border-neon-green/25 bg-black/10 p-8 text-center text-[#ccb894] sm:col-span-2 2xl:col-span-3">
                Add Pokémon from the Pokédex to start building your team.
              </div>
            )}
          </div>
        </section>

        <aside className="rpg-panel space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neon-purple">Coverage</p>
            <h2 className="mt-2 text-xl font-bold text-[#f8edd7]">Type spread</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {typeCoverage.length > 0 ? typeCoverage.map((type) => (
              <span key={type} className="rounded-full px-3 py-1 text-xs font-bold text-slate-950" style={{ backgroundColor: getTypeColor(type) }}>
                {capitalize(type)}
              </span>
            )) : <p className="text-sm text-[#c6b48f]">No coverage yet.</p>}
          </div>

          <div className="rounded-2xl border border-neon-green/25 bg-black/20 p-4">
            <p className="text-sm font-bold text-[#f8edd7]">Weakness summary</p>
            <div className="mt-3 space-y-2 text-sm text-[#d7c49e]">
              {weaknessSummary.length > 0 ? weaknessSummary.slice(0, 6).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between gap-3">
                  <span>{capitalize(type)}</span>
                  <span className="rounded-full border border-neon-green/25 bg-black/20 px-2 py-1 text-xs">{count}</span>
                </div>
              )) : <p>No weaknesses summary yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-neon-green/25 bg-black/20 p-4 text-sm text-[#d7c49e]">
            Your team persists automatically in localStorage.
          </div>
        </aside>
      </div>
    </div>
  );
};
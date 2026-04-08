import type { AppView } from '@/types/app';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useTeamStore } from '@/store/teamStore';

interface NavbarProps {
  view: AppView;
  onViewChange: (view: AppView) => void;
  onLogout: () => void;
}

const tabClass = (active: boolean): string =>
  `rounded-full border px-4 py-2 text-sm font-bold transition ${active ? 'border-rose-300 bg-rose-300 text-[#1a0608]' : 'border-rose-300/30 bg-[#11090a] text-[#f5e9e9] hover:border-rose-300/60 hover:bg-[#1a0d10]'}`;

export const Navbar = ({ view, onViewChange, onLogout }: NavbarProps): JSX.Element => {
  const favoritesCount = useFavoritesStore((state) => state.ids.length);
  const teamCount = useTeamStore((state) => state.members.length);

  return (
    <header className="sticky top-0 z-40 border-b border-rose-300/20 bg-[linear-gradient(180deg,rgba(12,7,8,0.96),rgba(7,4,5,0.92))] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:gap-4 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-rose-300">Pokédex Pro</p>
          <h1 className="mt-1 text-xl font-black text-[#f7eaea] md:text-2xl">Codex de Batalha</h1>
        </div>

        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button type="button" className={tabClass(view === 'pokedex')} onClick={() => onViewChange('pokedex')}>
            Pokédex
          </button>
          <button type="button" className={tabClass(view === 'team')} onClick={() => onViewChange('team')}>
            Team <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">{teamCount}</span>
          </button>
          <button type="button" className={tabClass(view === 'battle')} onClick={() => onViewChange('battle')}>
            Battle
          </button>
          <span className="rounded-full border border-neon-purple/40 bg-neon-purple/20 px-4 py-2 text-sm font-semibold text-[#f4e4c2]">
            Favorites {favoritesCount}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-rose-300/30 bg-[#11090a] px-4 py-2 text-sm font-bold text-rose-100 transition hover:border-rose-300/65 hover:bg-[#1a0d10]"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
};
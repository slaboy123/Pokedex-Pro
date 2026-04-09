import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AppView } from '../types/app';
import { Navbar } from '../components/Navbar';
import { ToastHost } from '../components/ui/ToastHost';
import { PokedexPage } from '../features/pokedex/components/PokedexPage';
import { TeamBuilder } from '../features/team/components/TeamBuilder';
import { BattleSimulator } from '../features/battle/components/BattleSimulator';
import { getPersistedView, switchView } from '../features/battle/navigation';
import { AuthGate } from '../features/auth/components/AuthGate';
import { useAuth } from '../hooks/useAuth';

export const App = (): JSX.Element => {
  const { isAuthenticated, signOut } = useAuth();
  const [view, setView] = useState<AppView>(() => getPersistedView());
  const isBattleView = view === 'battle';

  const handleLogin = (): void => {};

  const handleLogout = (): void => {
    void signOut();
    switchView('pokedex', setView);
  };

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_4%,_rgba(120,18,30,0.2),_transparent_30%),radial-gradient(circle_at_88%_80%,_rgba(70,10,18,0.18),_transparent_34%),linear-gradient(180deg,_#050303_0%,_#0b0708_56%,_#050303_100%)] text-[#f4e8e8]">
      {isBattleView ? null : <Navbar view={view} onViewChange={(next) => switchView(next, setView)} onLogout={handleLogout} />}

      {isBattleView ? (
        <BattleSimulator onViewChange={(next) => switchView(next, setView)} />
      ) : (
        <main className="pokedex-view mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28 }}
          >
            {view === 'pokedex' ? <PokedexPage /> : null}
            {view === 'team' ? <TeamBuilder /> : null}
          </motion.div>
        </main>
      )}

      <ToastHost />
    </div>
  );
};
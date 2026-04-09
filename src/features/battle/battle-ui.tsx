import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppView } from '@/types/app';
import type { AnimationState, BattleAnimationController } from './battle-animations';
import {
  animateHPBar,
  playAttackAnimation,
  playHitEffect,
  playHitStop,
  playImpactFrame,
  playSwitchAnimation,
  shakeCamera,
} from './battle-animations';
import { resolveTurn } from './battle-engine';
import { switchView } from './navigation';
import { useTeamStore } from '@/store/teamStore';
import { useToastStore } from '@/store/toastStore';
import type { BattleAction, BattleEvent, BattleFighter, BattleLogEntry, BattleMove, BattleSideState, NonVolatileStatus } from '@/types/battle';
import { BattleField } from './components/BattleField';
import { getMoveByName, getPokemonDetailBundle } from '@/services/pokeapi';
import { capitalize, cleanText } from '@/utils/pokemon';

interface BattleViewProps {
  onViewChange: (view: AppView) => void;
}

interface DisplayedHpState {
  player: number;
  enemy: number;
}

type BattleDifficulty = 'easy' | 'medium' | 'nightmare';

type ActionPanel = 'fight' | 'switch';

const DIFFICULTY_CONFIG: Record<BattleDifficulty, { label: string; level: number; statMultiplier: number; enemyNames: string[] }> = {
  easy: {
    label: 'Easy',
    level: 42,
    statMultiplier: 0.92,
    enemyNames: ['caterpie', 'weedle', 'pidgey', 'rattata', 'zubat', 'magikarp'],
  },
  medium: {
    label: 'Medium',
    level: 56,
    statMultiplier: 1.15,
    enemyNames: ['raichu', 'arcanine', 'gyarados', 'alakazam', 'machamp', 'gengar'],
  },
  nightmare: {
    label: 'Nightmare',
    level: 72,
    statMultiplier: 1.45,
    enemyNames: ['mewtwo', 'lugia', 'rayquaza', 'dialga', 'groudon', 'kyogre'],
  },
};

const inferMoveStatus = (effectText: string): { status: NonVolatileStatus | undefined; chance: number } => {
  const text = effectText.toLowerCase();
  if (text.includes('burn')) return { status: 'burn', chance: 0.2 };
  if (text.includes('poison')) return { status: 'poison', chance: 0.2 };
  if (text.includes('paraly')) return { status: 'paralysis', chance: 0.2 };
  if (text.includes('sleep')) return { status: 'sleep', chance: 0.15 };
  return { status: undefined, chance: 0 };
};

const mapCategory = (damageClass: string | undefined): BattleMove['category'] => {
  if (damageClass === 'special') return 'special';
  if (damageClass === 'status') return 'status';
  return 'physical';
};

const tuneEnemyFighter = (fighter: BattleFighter, level: number, statMultiplier: number): BattleFighter => {
  const levelScale = level / 50;
  const scale = levelScale * statMultiplier;
  const maxHp = Math.max(100, Math.round(fighter.maxHp * scale));

  return {
    ...fighter,
    level,
    maxHp,
    currentHp: maxHp,
    attack: Math.round(fighter.attack * scale),
    defense: Math.round(fighter.defense * scale),
    specialAttack: Math.round(fighter.specialAttack * scale),
    specialDefense: Math.round(fighter.specialDefense * scale),
    speed: Math.round(fighter.speed * Math.max(1, scale * 0.95)),
    status: null,
    sleepTurns: 0,
  };
};

const tunePlayerToMaxLevel = (fighter: BattleFighter): BattleFighter => {
  const level = 100;
  const levelScale = level / 50;
  const maxHp = Math.max(160, Math.round(fighter.maxHp * levelScale));

  return {
    ...fighter,
    level,
    maxHp,
    currentHp: maxHp,
    attack: Math.round(fighter.attack * levelScale),
    defense: Math.round(fighter.defense * levelScale),
    specialAttack: Math.round(fighter.specialAttack * levelScale),
    specialDefense: Math.round(fighter.specialDefense * levelScale),
    speed: Math.round(fighter.speed * levelScale),
    status: null,
    sleepTurns: 0,
  };
};

const buildFighter = async (identifier: string | number): Promise<BattleFighter> => {
  const bundle = await getPokemonDetailBundle(identifier);
  const stats = Object.fromEntries(bundle.pokemon.stats.map((stat) => [stat.stat.name, stat.base_stat]));

  const moveNames = bundle.pokemon.moves
    .map((slot) => slot.move.name)
    .filter((name, index, all) => all.indexOf(name) === index)
    .slice(0, 4);

  const moves = await Promise.all(
    moveNames.map(async (moveName) => {
      const move = await getMoveByName(moveName);
      const effect = cleanText(move.effect_entries.find((entry) => entry.language.name === 'en')?.short_effect ?? 'A basic attack.');
      const infliction = inferMoveStatus(effect);
      return {
        name: capitalize(move.name.replace(/-/g, ' ')),
        type: move.type.name,
        category: mapCategory(move.damage_class?.name),
        power: move.power ?? 40,
        accuracy: move.accuracy ?? 100,
        pp: move.pp ?? null,
        priority: move.priority,
        effect,
        inflictsStatus: infliction.status,
        inflictChance: infliction.chance,
      } satisfies BattleMove;
    }),
  );

  const hp = Math.max(80, Math.round((stats.hp as number) * 2.2 + 60));

  return {
    ...bundle.summary,
    maxHp: hp,
    currentHp: hp,
    attack: stats.attack as number,
    defense: stats.defense as number,
    specialAttack: (stats['special-attack'] as number) ?? (stats.attack as number),
    specialDefense: (stats['special-defense'] as number) ?? (stats.defense as number),
    speed: stats.speed as number,
    level: 50,
    moves,
    status: null,
    sleepTurns: 0,
  };
};

const byBatch = (events: BattleEvent[]): BattleEvent[][] => {
  const map = new Map<string, BattleEvent[]>();
  const order: string[] = [];

  events.forEach((event) => {
    if (!map.has(event.batchId)) {
      map.set(event.batchId, []);
      order.push(event.batchId);
    }
    map.get(event.batchId)?.push(event);
  });

  return order.map((batchId) => map.get(batchId) ?? []);
};

export const BattleView = ({ onViewChange }: BattleViewProps): JSX.Element => {
  const team = useTeamStore((state) => state.members);
  const pushToast = useToastStore((state) => state.pushToast);

  const [difficulty, setDifficulty] = useState<BattleDifficulty>('easy');
  const [phase, setPhase] = useState<'setup' | 'resolving' | 'player-turn' | 'finished'>('setup');
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [round, setRound] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(team[0]?.id ?? null);
  const [playerSide, setPlayerSide] = useState<BattleSideState | null>(null);
  const [enemySide, setEnemySide] = useState<BattleSideState | null>(null);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);
  const [actionPanel, setActionPanel] = useState<ActionPanel>('fight');
  const [displayedHp, setDisplayedHp] = useState<DisplayedHpState>({ player: 0, enemy: 0 });
  const [logEntries, setLogEntries] = useState<BattleLogEntry[]>([]);
  const [animationState, setAnimationState] = useState<AnimationState>({
    projectile: null,
    hitSide: null,
    shakingSide: null,
    fadingSide: null,
    lungingSide: null,
    camera: { x: 0, y: 0 },
    impactFlash: false,
    hitStop: false,
  });

  const logRef = useRef<HTMLDivElement>(null);
  const displayedHpRef = useRef(displayedHp);

  useEffect(() => {
    if (selectedPlayerId === null && team[0]) {
      setSelectedPlayerId(team[0].id);
    }
  }, [selectedPlayerId, team]);

  useEffect(() => {
    displayedHpRef.current = displayedHp;
  }, [displayedHp]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logEntries]);

  const playerActive = useMemo(() => {
    if (!playerSide) return null;
    return playerSide.roster[playerSide.activeIndex] ?? null;
  }, [playerSide]);

  const enemyActive = useMemo(() => {
    if (!enemySide) return null;
    return enemySide.roster[enemySide.activeIndex] ?? null;
  }, [enemySide]);

  const selectedMove = playerActive?.moves[selectedMoveIndex] ?? playerActive?.moves[0] ?? null;

  const animationController: BattleAnimationController = {
    setAnimationState: (updater) => setAnimationState((prev) => updater(prev)),
    updateDisplayedHp: (side, nextHp) => setDisplayedHp((prev) => ({ ...prev, [side]: Math.max(0, nextHp) })),
    getDisplayedHp: (side) => displayedHpRef.current[side],
  };

  const pushLog = (text: string, tone: BattleLogEntry['tone'] = 'neutral'): void => {
    setLogEntries((prev) => [...prev, { id: crypto.randomUUID(), text, tone }].slice(-80));
  };

  const processEvent = async (event: BattleEvent): Promise<void> => {
    if (event.type === 'log' && event.text) {
      pushLog(event.text, event.tone ?? 'neutral');
      return;
    }

    if (event.type === 'switch') {
      await playSwitchAnimation(event.side, animationController);
      return;
    }

    if (event.type === 'attack' && event.move) {
      const target = event.side === 'player' ? 'enemy' : 'player';
      await playAttackAnimation(event.side, target, event.move, animationController);
      return;
    }

    if (event.type === 'damage' && event.nextHp !== undefined) {
      const target = event.side;
      const targetFighter = target === 'player' ? playerActive : enemyActive;
      const maxHp = Math.max(1, targetFighter?.maxHp ?? 100);
      const damageRatio = Math.max(0, (event.damage ?? 0) / maxHp);
      const intensity = event.critical ? 14 : damageRatio > 0.25 ? 9 : 5;
      const hitStopDuration = event.critical ? 95 : 65;

      await Promise.all([
        playImpactFrame(animationController),
        playHitStop(hitStopDuration, animationController),
        playHitEffect(target, animationController),
        shakeCamera(intensity, event.critical ? 230 : 170, animationController),
        animateHPBar(target, event.nextHp, animationController, Math.max(0.5, damageRatio * 2.4)),
      ]);
      return;
    }
  };

  const runQueue = async (events: BattleEvent[]): Promise<void> => {
    const batches = byBatch(events);
    for (const batch of batches) {
      await Promise.all(batch.map((event) => processEvent(event)));
    }
  };

  const startBattle = async (): Promise<void> => {
    if (team.length === 0 || selectedPlayerId === null) {
      pushToast({ title: 'Battle', message: 'Monte um time com até 6 Pokémon antes de iniciar.', tone: 'warning' });
      return;
    }

    setProcessing(true);
    setPhase('resolving');
    setWinner(null);
    setRound(1);
    setSelectedMoveIndex(0);
    setActionPanel('fight');
    setLogEntries([]);

    const difficultyPreset = DIFFICULTY_CONFIG[difficulty];
    const playerRosterRaw = await Promise.all(team.map((member) => buildFighter(member.id)));
    const playerRoster = playerRosterRaw.map((fighter) => tunePlayerToMaxLevel(fighter));
    const enemyRosterRaw = await Promise.all(difficultyPreset.enemyNames.map((name) => buildFighter(name)));
    const enemyRoster = enemyRosterRaw.map((fighter) => tuneEnemyFighter(fighter, difficultyPreset.level, difficultyPreset.statMultiplier));

    const leadPlayerIndex = Math.max(0, playerRoster.findIndex((fighter) => fighter.id === selectedPlayerId));
    const nextPlayerSide: BattleSideState = { roster: playerRoster, activeIndex: leadPlayerIndex >= 0 ? leadPlayerIndex : 0 };
    const nextEnemySide: BattleSideState = { roster: enemyRoster, activeIndex: 0 };

    setPlayerSide(nextPlayerSide);
    setEnemySide(nextEnemySide);

    const playerLead = nextPlayerSide.roster[nextPlayerSide.activeIndex];
    const enemyLead = nextEnemySide.roster[nextEnemySide.activeIndex];

    setDisplayedHp({ player: playerLead.currentHp, enemy: enemyLead.currentHp });
    pushLog(`Battle mode: ${difficultyPreset.label}`, 'warning');
    pushLog(`${playerLead.name} entrou em campo!`, 'neutral');
    pushLog(`${enemyLead.name} apareceu no lado inimigo!`, 'neutral');

    setPhase('player-turn');
    setProcessing(false);
  };

  const executeAction = async (action: BattleAction): Promise<void> => {
    if (!playerSide || !enemySide || !playerActive || !enemyActive || processing || phase !== 'player-turn') {
      return;
    }

    if (action.type === 'switch' && action.targetIndex === playerSide.activeIndex) {
      return;
    }

    setProcessing(true);
    setPhase('resolving');

    const resolution = resolveTurn(playerSide, enemySide, action, round);
    await runQueue(resolution.queue);

    setPlayerSide(resolution.nextPlayerSide);
    setEnemySide(resolution.nextEnemySide);
    setRound(resolution.nextRound);

    const nextPlayer = resolution.nextPlayerSide.roster[resolution.nextPlayerSide.activeIndex];
    const nextEnemy = resolution.nextEnemySide.roster[resolution.nextEnemySide.activeIndex];

    setDisplayedHp({
      player: nextPlayer.currentHp,
      enemy: nextEnemy.currentHp,
    });

    if (resolution.winner) {
      setWinner(resolution.winner);
      setPhase('finished');
      pushLog(resolution.winner === 'player' ? 'Vitória! Você derrotou todo o time inimigo.' : 'Derrota! Seu time foi completamente derrotado.', resolution.winner === 'player' ? 'success' : 'danger');
    } else {
      setPhase('player-turn');
      const hasBenchForPlayer = resolution.nextPlayerSide.roster.some((fighter, index) => index !== resolution.nextPlayerSide.activeIndex && fighter.currentHp > 0);
      if (nextPlayer.currentHp <= 0 && hasBenchForPlayer) {
        setActionPanel('switch');
        pushLog(`${nextPlayer.name} desmaiou. Troque para continuar a luta.`, 'warning');
      }
    }

    setProcessing(false);
  };

  const onSelectSwitch = async (targetIndex: number): Promise<void> => {
    if (!playerSide) return;
    const target = playerSide.roster[targetIndex];
    if (!target || target.currentHp <= 0) {
      pushToast({ title: 'Switch', message: 'Esse Pokémon não pode entrar agora.', tone: 'warning' });
      return;
    }

    await executeAction({ type: 'switch', targetIndex });
    setActionPanel('fight');
  };

  const playerAlive = playerSide?.roster.filter((fighter) => fighter.currentHp > 0).length ?? 0;
  const enemyAlive = enemySide?.roster.filter((fighter) => fighter.currentHp > 0).length ?? 0;
  const resultTitle = winner === 'player' ? 'VITORIA' : winner === 'enemy' ? 'DERROTA' : null;
  const resultMessage = winner === 'player'
    ? 'Voce venceu a batalha. Seu time dominou o campo.'
    : winner === 'enemy'
      ? 'Seu time foi derrotado. Ajuste estrategia e tente novamente.'
      : '';

  return (
    <section className="battle-view fixed inset-0 z-50 flex h-screen w-screen flex-col bg-[linear-gradient(180deg,#0e1316_0%,#131d1e_100%)] text-[#ecf6f1]">
      <header className="flex items-center justify-between border-b border-[#2f4240] bg-[#111c1e]/95 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#a4c8b7]">Competitive Arena</p>
          <p className="text-sm font-bold text-[#d9eee4]">Turn {round} • {DIFFICULTY_CONFIG[difficulty].label}</p>
        </div>
        <button
          type="button"
          onClick={() => switchView('pokedex', onViewChange)}
          className="rounded-md border border-[#3f5752] bg-[#1a2b2a] px-3 py-1.5 text-xs font-bold text-[#daf2e6] hover:bg-[#243937]"
        >
          Exit Battle
        </button>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
          <div className="relative">
            <BattleField
              playerPokemon={playerActive}
              enemyPokemon={enemyActive}
              playerDisplayedHp={displayedHp.player}
              enemyDisplayedHp={displayedHp.enemy}
              animationState={animationState}
            />

            {winner ? (
              <div className="absolute inset-0 z-[80] bg-[#061013]/82 p-4">
                <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-4">
                  <div className={`pointer-events-auto w-full rounded-2xl border p-6 shadow-2xl ${winner === 'player' ? 'border-emerald-400/45 bg-[linear-gradient(180deg,#0f2a1f_0%,#10231f_100%)]' : 'border-rose-400/45 bg-[linear-gradient(180deg,#35151b_0%,#261218_100%)]'}`}>
                    <p className={`text-xs font-bold uppercase tracking-[0.25em] ${winner === 'player' ? 'text-emerald-200' : 'text-rose-200'}`}>Resultado da batalha</p>
                    <h2 className={`mt-2 text-3xl font-black uppercase ${winner === 'player' ? 'text-emerald-100' : 'text-rose-100'}`}>{resultTitle}</h2>
                    <p className="mt-3 text-sm text-[#d7ece2]">{resultMessage}</p>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => switchView('pokedex', onViewChange)}
                        className="rounded-md border border-[#6f8b84] bg-[#1a3431] px-3 py-2 text-sm font-bold text-[#def4eb] transition hover:bg-[#244541]"
                      >
                        Voltar para Pokedex
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void startBattle();
                        }}
                        className={`rounded-md border px-3 py-2 text-sm font-bold transition ${winner === 'player' ? 'border-emerald-300/45 bg-emerald-300/20 text-emerald-100 hover:bg-emerald-300/28' : 'border-rose-300/45 bg-rose-300/20 text-rose-100 hover:bg-rose-300/28'}`}
                      >
                        Continuar lutando
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <section className="rounded-2xl border border-[#34514c] bg-[#132224]/95 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[#a7cabd]">
                Player Team {playerAlive}/6 • Enemy Team {enemyAlive}/6 • Phase {phase}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void startBattle()}
                  disabled={processing}
                  className="rounded-md border border-[#4d6c65] bg-[#27423f] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={() => setActionPanel('fight')}
                  disabled={phase !== 'player-turn' || processing || winner !== null}
                  className={`rounded-md border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${actionPanel === 'fight' ? 'border-[#89b2a4] bg-[#30544e]' : 'border-[#4d6c65] bg-[#1a2f2c]'}`}
                >
                  Fight
                </button>
                <button
                  type="button"
                  onClick={() => setActionPanel('switch')}
                  disabled={phase !== 'player-turn' || processing || winner !== null}
                  className={`rounded-md border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${actionPanel === 'switch' ? 'border-[#89b2a4] bg-[#30544e]' : 'border-[#4d6c65] bg-[#1a2f2c]'}`}
                >
                  Switch
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.entries(DIFFICULTY_CONFIG) as Array<[BattleDifficulty, (typeof DIFFICULTY_CONFIG)[BattleDifficulty]]>).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  disabled={phase !== 'setup' || processing}
                  className={`rounded-md border px-3 py-1 text-xs font-semibold disabled:opacity-45 ${difficulty === key ? 'border-[#9bc7b7] bg-[#2f4b48]' : 'border-[#4d6c65] bg-[#172b2a]'}`}
                >
                  {config.label}
                </button>
              ))}
            </div>

            {phase === 'setup' ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {team.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(member.id)}
                    className={`rounded-md border px-3 py-2 text-left text-xs ${selectedPlayerId === member.id ? 'border-[#9bc7b7] bg-[#2f4b48]' : 'border-[#4d6c65] bg-[#172b2a]'}`}
                  >
                    <p className="font-bold uppercase">{member.name}</p>
                    <p className="mt-1 text-[11px] text-[#9ebcb1]">Lead Pokémon</p>
                  </button>
                ))}
              </div>
            ) : null}

            {actionPanel === 'fight' ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(playerActive?.moves ?? []).map((move, index) => (
                  <button
                    key={`${move.name}-${index}`}
                    type="button"
                    disabled={phase !== 'player-turn' || processing || winner !== null || (playerActive?.currentHp ?? 0) <= 0}
                    onClick={() => {
                      setSelectedMoveIndex(index);
                      void executeAction({ type: 'fight', moveIndex: index });
                    }}
                    className={`rounded-md border px-3 py-2 text-left text-xs disabled:opacity-50 ${selectedMoveIndex === index ? 'border-[#9bc7b7] bg-[#2f4b48]' : 'border-[#4d6c65] bg-[#172b2a]'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold uppercase">{move.name}</span>
                      <span className="rounded border border-[#617a73] px-1.5 py-0.5 text-[10px] uppercase">{move.type}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#9ebcb1]">Power {move.power} • Accuracy {move.accuracy} • {move.category}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(playerSide?.roster ?? []).map((fighter, index) => (
                  <button
                    key={`${fighter.id}-${index}`}
                    type="button"
                    disabled={fighter.currentHp <= 0 || index === playerSide?.activeIndex || phase !== 'player-turn' || processing}
                    onClick={() => void onSelectSwitch(index)}
                    className={`rounded-md border px-3 py-2 text-left text-xs disabled:opacity-45 ${index === playerSide?.activeIndex ? 'border-[#89b2a4] bg-[#2f4b48]' : 'border-[#4d6c65] bg-[#172b2a]'}`}
                  >
                    <p className="font-bold uppercase">{fighter.name}</p>
                    <p className="mt-1 text-[11px] text-[#9ebcb1]">HP {fighter.currentHp}/{fighter.maxHp}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 rounded-md border border-[#4d6c65] bg-[#152a28] px-3 py-2 text-[11px] text-[#c4dfd4]">
              {selectedMove ? `${selectedMove.name}: ${selectedMove.effect}` : 'Start the battle to unlock actions.'}
            </div>
          </section>
        </div>

        <aside className="flex min-h-0 flex-col rounded-2xl border border-[#34514c] bg-[#132224]/95 p-3">
          <h3 className="text-sm font-black uppercase text-[#d7eee3]">Battle Log</h3>
          <p className="mt-1 text-[11px] text-[#9dbeb2]">Atualização em tempo real</p>
          <div ref={logRef} className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {logEntries.length > 0 ? logEntries.map((entry) => (
              <p key={entry.id} className={`rounded-md border px-2.5 py-2 text-xs ${entry.tone === 'success' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : entry.tone === 'warning' ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : entry.tone === 'danger' ? 'border-rose-400/40 bg-rose-400/10 text-rose-200' : 'border-[#44655f] bg-[#19302d] text-[#d8ece4]'}`}>
                {entry.text}
              </p>
            )) : (
              <p className="text-xs text-[#9dbeb2]">Nenhum evento ainda.</p>
            )}
          </div>
        </aside>
      </div>

    </section>
  );
};

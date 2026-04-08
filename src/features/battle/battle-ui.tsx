import { useEffect, useMemo, useRef, useState } from 'react';
import { getMoveByName, getPokemonDetailBundle } from '@/services/pokeapi';
import { capitalize, cleanText, formatId } from '@/utils/pokemon';
import type { AppView } from '@/types/app';
import type { AnimationState, BattleAnimationController } from './battle-animations';
import { animateHPBar, playAttackAnimation, playHitEffect, playSwitchAnimation, shakeSprite } from './battle-animations';
import { resolveTurn } from './battle-engine';
import { switchView } from './navigation';
import { useTeamStore } from '@/store/teamStore';
import { useToastStore } from '@/store/toastStore';
import type { BattleEvent, BattleFighter, BattleLogEntry, BattleMove, NonVolatileStatus } from '@/types/battle';

interface BattleViewProps {
  onViewChange: (view: AppView) => void;
}

interface DisplayedHpState {
  player: number;
  enemy: number;
}

type BattleDifficulty = 'easy' | 'medium' | 'nightmare';

const DIFFICULTY_CONFIG: Record<BattleDifficulty, { label: string; description: string; level: number; statMultiplier: number; enemyNames: string[] }> = {
  easy: {
    label: 'Facil',
    description: '6 pokemons fracos',
    level: 42,
    statMultiplier: 0.9,
    enemyNames: ['caterpie', 'weedle', 'pidgey', 'rattata', 'zubat', 'magikarp'],
  },
  medium: {
    label: 'Medio',
    description: '6 pokemons medianos',
    level: 56,
    statMultiplier: 1.15,
    enemyNames: ['raichu', 'arcanine', 'gyarados', 'alakazam', 'machamp', 'gengar'],
  },
  nightmare: {
    label: 'Pesadelo',
    description: 'time de 6 lendarios super fortes',
    level: 74,
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

const statusLabel = (status: NonVolatileStatus | null): string => {
  if (!status) return 'OK';
  return status.toUpperCase();
};

export const BattleView = ({ onViewChange }: BattleViewProps): JSX.Element => {
  const team = useTeamStore((state) => state.members);
  const pushToast = useToastStore((state) => state.pushToast);

  const [difficulty, setDifficulty] = useState<BattleDifficulty>('easy');
  const [playerRoster, setPlayerRoster] = useState<BattleFighter[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [enemyRoster, setEnemyRoster] = useState<BattleFighter[]>([]);
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(team[0]?.id ?? null);
  const [player, setPlayer] = useState<BattleFighter | null>(null);
  const [enemy, setEnemy] = useState<BattleFighter | null>(null);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'setup' | 'resolving' | 'player-turn' | 'finished'>('setup');
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [logEntries, setLogEntries] = useState<BattleLogEntry[]>([]);
  const [displayedHp, setDisplayedHp] = useState<DisplayedHpState>({ player: 0, enemy: 0 });
  const displayedHpRef = useRef<DisplayedHpState>({ player: 0, enemy: 0 });

  const [animationState, setAnimationState] = useState<AnimationState>({
    projectile: null,
    hitSide: null,
    shakingSide: null,
    fadingSide: null,
  });

  const logRef = useRef<HTMLDivElement>(null);
  const battleQueueRef = useRef<BattleEvent[]>([]);

  const selectedMember = useMemo(() => team.find((member) => member.id === selectedPlayerId) ?? null, [selectedPlayerId, team]);
  const playerAliveCount = useMemo(() => playerRoster.filter((fighter) => fighter.currentHp > 0).length, [playerRoster]);
  const enemyAliveCount = useMemo(() => enemyRoster.filter((fighter) => fighter.currentHp > 0).length, [enemyRoster]);

  const difficultyPreset = DIFFICULTY_CONFIG[difficulty];

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

  const animationController: BattleAnimationController = {
    setAnimationState: (updater) => setAnimationState((prev) => updater(prev)),
    updateDisplayedHp: (side, nextHp) => {
      setDisplayedHp((prev) => ({ ...prev, [side]: Math.max(0, nextHp) }));
    },
    getDisplayedHp: (side) => displayedHpRef.current[side],
  };

  const pushLog = (text: string, tone: BattleLogEntry['tone'] = 'neutral'): void => {
    setLogEntries((prev) => [...prev, { id: crypto.randomUUID(), text, tone }].slice(-40));
  };

  const processEvent = async (event: BattleEvent): Promise<void> => {
    if (event.type === 'log' && event.text) {
      pushLog(event.text, event.tone ?? 'neutral');
      return;
    }

    if (event.type === 'attack' && event.move) {
      const target = event.side === 'player' ? 'enemy' : 'player';
      await playAttackAnimation(event.side, target, event.move, animationController);
      return;
    }

    if (event.type === 'damage' && event.nextHp !== undefined) {
      const side = event.side;
      await Promise.all([
        animateHPBar(side, event.nextHp, animationController),
        playHitEffect(side, animationController),
        shakeSprite(side, animationController),
      ]);

      if (side === 'player') {
        setPlayer((prev) => (prev ? { ...prev, currentHp: event.nextHp ?? prev.currentHp } : prev));
      } else {
        setEnemy((prev) => (prev ? { ...prev, currentHp: event.nextHp ?? prev.currentHp } : prev));
      }
      return;
    }

    if (event.type === 'status' && event.nextStatus !== undefined) {
      const nextStatus = event.nextStatus ?? null;
      if (event.side === 'player') {
        setPlayer((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      } else {
        setEnemy((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
      return;
    }

    if (event.type === 'switch') {
      await playSwitchAnimation(event.side, animationController);
    }
  };

  const runQueue = async (events: BattleEvent[]): Promise<void> => {
    battleQueueRef.current = [...events];
    const batches = byBatch(events);
    for (const batch of batches) {
      await Promise.all(batch.map((event) => processEvent(event)));
      battleQueueRef.current = battleQueueRef.current.filter((queued) => !batch.some((done) => done.id === queued.id));
    }
  };

  const startBattle = async (): Promise<void> => {
    if (team.length === 0 || !selectedMember) {
      pushToast({ title: 'Battle', message: 'Monte um time com ate 6 pokemons para usar na luta.', tone: 'warning' });
      return;
    }

    setProcessing(true);
    setPhase('resolving');
    setWinner(null);
    setLogEntries([]);
    setShowSwitch(false);

    const playerTeam = await Promise.all(team.map((member) => buildFighter(member.id)));
    const enemyBases = await Promise.all(difficultyPreset.enemyNames.map((name) => buildFighter(name)));

    const roster = enemyBases.map((fighter) => tuneEnemyFighter(fighter, difficultyPreset.level, difficultyPreset.statMultiplier));
    const leadIndex = Math.max(
      0,
      playerTeam.findIndex((fighter) => fighter.id === selectedMember.id),
    );
    const leadPlayer = playerTeam[leadIndex] ?? playerTeam[0] ?? null;
    const firstEnemy = roster[0] ?? null;

    if (!leadPlayer || !firstEnemy) {
      pushToast({ title: 'Battle', message: 'Nao foi possivel montar os times da batalha.', tone: 'warning' });
      setPhase('setup');
      setProcessing(false);
      return;
    }

    setPlayerRoster(playerTeam);
    setActivePlayerIndex(leadIndex);
    setPlayer(leadPlayer);
    setEnemyRoster(roster);
    setEnemyIndex(0);
    setEnemy(firstEnemy);
    setDisplayedHp({ player: leadPlayer.currentHp, enemy: firstEnemy.currentHp });
    setRound(1);
    setPhase('player-turn');
    pushLog(`Dificuldade: ${difficultyPreset.label} (${difficultyPreset.description}).`, 'warning');
    pushLog(`${leadPlayer.name} entrou na arena como lider do seu time!`, 'neutral');
    pushLog(`${firstEnemy.name} apareceu como 1/6 do time inimigo!`, 'neutral');
    pushLog(`IA inimiga avaliou golpes por dano esperado e efetividade de tipo.`, 'neutral');
    setProcessing(false);
  };

  const hasAvailableSwitch = (currentIndex: number, roster: BattleFighter[]): boolean =>
    roster.some((fighter, index) => index !== currentIndex && fighter.currentHp > 0);

  const onUseMove = async (moveIndex: number): Promise<void> => {
    if (!player || !enemy || processing || phase !== 'player-turn' || player.currentHp <= 0 || showSwitch) {
      return;
    }

    setProcessing(true);
    setPhase('resolving');

    const resolution = resolveTurn(player, enemy, moveIndex, round);
    await runQueue(resolution.queue);

    const updatedPlayerRoster = playerRoster.map((fighter, index) => (index === activePlayerIndex ? resolution.nextPlayer : fighter));
    const updatedEnemyRoster = enemyRoster.map((fighter, index) => (index === enemyIndex ? resolution.nextEnemy : fighter));

    setPlayerRoster(updatedPlayerRoster);
    setEnemyRoster(updatedEnemyRoster);
    setPlayer(resolution.nextPlayer);
    setEnemy(resolution.nextEnemy);
    setRound(resolution.nextRound);

    if (resolution.winner) {
      if (resolution.winner === 'player') {
        const nextIndex = enemyIndex + 1;
        const nextEnemy = updatedEnemyRoster[nextIndex];

        pushLog(`${resolution.nextEnemy.name} desmaiou.`, 'success');

        if (nextEnemy) {
          await runQueue([
            { id: crypto.randomUUID(), batchId: crypto.randomUUID(), type: 'switch', side: 'enemy' },
            {
              id: crypto.randomUUID(),
              batchId: crypto.randomUUID(),
              type: 'log',
              side: 'enemy',
              text: `${nextEnemy.name} entrou na arena! (${nextIndex + 1}/6)`,
              tone: 'warning',
            },
          ]);

          setEnemyIndex(nextIndex);
          setEnemy(nextEnemy);
          setDisplayedHp((prev) => ({ ...prev, enemy: nextEnemy.currentHp }));
          setPhase('player-turn');
        } else {
          setWinner('player');
          setPhase('finished');
          pushLog('Time inimigo completo derrotado. Voce venceu a batalha!', 'success');
        }
      } else if (hasAvailableSwitch(activePlayerIndex, updatedPlayerRoster)) {
        pushLog(`${resolution.nextPlayer.name} desmaiou. Escolha outro pokemon do seu time!`, 'warning');
        setShowSwitch(true);
        setPhase('player-turn');
      } else {
        setWinner('enemy');
        setPhase('finished');
        pushLog('Todos os seus pokemons desmaiaram. Voce perdeu.', 'danger');
      }
    } else {
      setPhase('player-turn');
    }

    setProcessing(false);
  };

  const onSwitchPokemon = async (nextIndex: number): Promise<void> => {
    if (processing || phase !== 'player-turn') {
      return;
    }

    const chosen = playerRoster[nextIndex];
    if (!chosen) {
      return;
    }

    if (chosen.currentHp <= 0) {
      pushToast({ title: 'Battle', message: `${chosen.name} esta desmaiado e nao pode entrar.`, tone: 'warning' });
      return;
    }

    if (nextIndex === activePlayerIndex && player && player.currentHp > 0) {
      return;
    }

    setProcessing(true);
    setShowSwitch(false);

    await runQueue([
      {
        id: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        type: 'switch',
        side: 'player',
        text: player ? `${player.name}, volte!` : 'Troca de pokemon!',
      },
      { id: crypto.randomUUID(), batchId: crypto.randomUUID(), type: 'log', side: 'player', text: `${chosen.name}, eu escolho voce!`, tone: 'neutral' },
    ]);

    setPlayer(chosen);
    setActivePlayerIndex(nextIndex);
    setDisplayedHp((prev) => ({ ...prev, player: chosen.currentHp }));
    setSelectedPlayerId(chosen.id);
    setProcessing(false);
  };

  const hpPercent = (current: number, max: number): number => Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <section className="battle-view fixed inset-0 z-50 flex flex-col bg-[radial-gradient(circle_at_top,rgba(143,61,79,0.24),transparent_36%),linear-gradient(180deg,#0b0908_0%,#15100c_100%)] text-[#f6ebd3]">
      <header className="flex items-center justify-between border-b border-neon-green/25 px-4 py-3 md:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neon-purple">Battle View</p>
          <h1 className="text-2xl font-black text-[#f8edd7]">Arena Realtime 1v1</h1>
        </div>
        <button
          type="button"
          onClick={() => switchView('pokedex', onViewChange)}
          className="rounded-full border border-neon-green/30 bg-black/20 px-4 py-2 text-sm font-bold text-[#f6ebd3] transition hover:border-neon-green/70 hover:bg-black/35"
        >
          Voltar para Pokedex
        </button>
      </header>

      <div className="grid flex-1 gap-4 overflow-hidden p-4 md:grid-cols-[1.2fr_0.8fr] md:p-6">
        <div className="grid gap-4 grid-rows-[auto_1fr_auto] overflow-hidden">
          <div className="rpg-panel flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="rpg-tag">Turno</p>
              <p className="text-2xl font-black text-[#f8edd7]">{round}</p>
            </div>
            <div className="grid gap-2 md:text-right text-sm text-[#dfcca8]">
              <p>
                Dificuldade: <span className="font-semibold text-[#f8edd7]">{difficultyPreset.label}</span>
              </p>
              <p>
                Seu time: <span className="font-semibold text-[#f8edd7]">{playerAliveCount}/6 vivos</span>
              </p>
              <p>
                Time inimigo: <span className="font-semibold text-[#f8edd7]">{enemyAliveCount}/6 vivos</span>
              </p>
              <p>Fase: {phase}</p>
              <p>Estado: {processing ? 'resolvendo...' : 'pronto'}</p>
            </div>
          </div>

          <div className="rpg-panel relative grid gap-4 overflow-hidden p-4 md:grid-cols-2">
            {animationState.projectile ? (
              <div className={`pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${animationState.projectile.kind === 'fire' ? 'bg-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.9)]' : 'bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.9)]'} ${animationState.projectile.from === 'player' ? 'left-[36%] animate-[ping_0.25s_ease-out_1]' : 'left-[58%] animate-[ping_0.25s_ease-out_1]'}`} />
            ) : null}

            <article className={`rounded-3xl border border-neon-green/25 bg-black/20 p-4 transition ${animationState.shakingSide === 'player' ? 'translate-x-1' : ''} ${animationState.hitSide === 'player' ? 'brightness-150' : ''} ${animationState.fadingSide === 'player' ? 'opacity-30' : 'opacity-100'}`}>
              <p className="text-xs uppercase tracking-[0.22em] text-[#af9a74]">Player</p>
              <h2 className="mt-1 text-xl font-bold text-[#f8edd7]">{player?.name ?? '---'}</h2>
              <p className="text-xs text-[#ccb894]">{player ? formatId(player.id) : ''}</p>
              <div className="mt-3 rounded-2xl bg-black/25 p-3">
                {player ? <img src={player.sprite} alt={player.name} className="mx-auto h-32 w-32 object-contain" /> : null}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-[#d7c49e]">
                  <span>HP</span>
                  <span>{Math.max(0, displayedHp.player)}/{player?.maxHp ?? 0}</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-neon-green transition-[width] duration-200" style={{ width: `${player ? hpPercent(displayedHp.player, player.maxHp) : 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-[#ccb894]">Status: {statusLabel(player?.status ?? null)}</p>
              </div>
            </article>

            <article className={`rounded-3xl border border-neon-green/25 bg-black/20 p-4 transition ${animationState.shakingSide === 'enemy' ? '-translate-x-1' : ''} ${animationState.hitSide === 'enemy' ? 'brightness-150' : ''} ${animationState.fadingSide === 'enemy' ? 'opacity-30' : 'opacity-100'}`}>
              <p className="text-xs uppercase tracking-[0.22em] text-[#af9a74]">Enemy AI</p>
              <h2 className="mt-1 text-xl font-bold text-[#f8edd7]">{enemy?.name ?? '---'}</h2>
              <p className="text-xs text-[#ccb894]">{enemy ? formatId(enemy.id) : ''}</p>
              <div className="mt-3 rounded-2xl bg-black/25 p-3">
                {enemy ? <img src={enemy.sprite} alt={enemy.name} className="mx-auto h-32 w-32 object-contain" /> : null}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-[#d7c49e]">
                  <span>HP</span>
                  <span>{Math.max(0, displayedHp.enemy)}/{enemy?.maxHp ?? 0}</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-neon-purple transition-[width] duration-200" style={{ width: `${enemy ? hpPercent(displayedHp.enemy, enemy.maxHp) : 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-[#ccb894]">Status: {statusLabel(enemy?.status ?? null)}</p>
              </div>
            </article>
          </div>

          <div className="rpg-panel p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#f8edd7]">Acoes</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void startBattle()}
                  disabled={processing}
                  className="rounded-full border border-neon-green bg-neon-green px-4 py-2 text-xs font-bold text-[#24190e] disabled:opacity-50"
                >
                  Iniciar
                </button>
                <button
                  type="button"
                  onClick={() => setShowSwitch((value) => !value)}
                  disabled={phase !== 'player-turn' || processing}
                  className="rounded-full border border-neon-green/35 bg-black/20 px-4 py-2 text-xs font-bold text-[#f6ebd3] disabled:opacity-50"
                >
                  Trocar Pokemon
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {(Object.entries(DIFFICULTY_CONFIG) as Array<[BattleDifficulty, (typeof DIFFICULTY_CONFIG)[BattleDifficulty]]>).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  disabled={processing || phase === 'player-turn' || phase === 'resolving'}
                  className={`rounded-2xl border px-3 py-2 text-left text-xs transition disabled:opacity-40 ${difficulty === key ? 'border-neon-green bg-neon-green/20 text-[#f8edd7]' : 'border-neon-green/20 bg-black/20 text-[#f6ebd3] hover:border-neon-green/55'}`}
                >
                  <p className="font-bold">{config.label}</p>
                  <p className="mt-1 text-[11px] text-[#ccb894]">{config.description}</p>
                </button>
              ))}
            </div>

            {phase === 'setup' ? (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {team.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(member.id)}
                    className={`rounded-2xl border px-3 py-2 text-left text-xs transition ${selectedPlayerId === member.id ? 'border-neon-green bg-neon-green/20 text-[#f8edd7]' : 'border-neon-green/20 bg-black/20 text-[#f6ebd3] hover:border-neon-green/55'}`}
                  >
                    <p className="font-bold">{member.name}</p>
                    <p className="mt-1 text-[11px] text-[#ccb894]">Clique para definir como lider inicial</p>
                  </button>
                ))}
              </div>
            ) : null}

            {showSwitch ? (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {playerRoster.map((fighter, index) => (
                  <button
                    key={`${fighter.id}-${index}`}
                    type="button"
                    onClick={() => void onSwitchPokemon(index)}
                    disabled={fighter.currentHp <= 0 || index === activePlayerIndex}
                    className={`rounded-2xl border px-3 py-2 text-left text-xs transition ${fighter.currentHp <= 0 ? 'border-rose-500/30 bg-rose-900/20 text-rose-200 opacity-60' : index === activePlayerIndex ? 'border-neon-green bg-neon-green/20 text-[#f8edd7]' : 'border-neon-green/20 bg-black/20 text-[#f6ebd3] hover:border-neon-green/55'}`}
                  >
                    <p className="font-bold">{fighter.name}</p>
                    <p className="mt-1 text-[11px] text-[#ccb894]">HP {fighter.currentHp}/{fighter.maxHp}</p>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {(player?.moves ?? []).map((move, index) => (
                <button
                  key={move.name}
                  type="button"
                  onClick={() => void onUseMove(index)}
                  disabled={phase !== 'player-turn' || processing || !player || !enemy || winner !== null || player.currentHp <= 0 || showSwitch}
                  className="rounded-2xl border border-neon-green/20 bg-black/20 p-3 text-left transition hover:border-neon-green/60 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#f8edd7]">{move.name}</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase text-[#dfcca8]">{move.type}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#ccb894]">{move.category} | Pow {move.power} | Acc {move.accuracy}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="rpg-panel flex min-h-0 flex-col p-4">
          <h3 className="text-lg font-bold text-[#f8edd7]">Battle Log</h3>
          <p className="mt-1 text-xs text-[#ccb894]">Atualizacao em tempo real estilo Showdown</p>
          <div ref={logRef} className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {logEntries.length > 0 ? logEntries.map((entry) => (
              <p key={entry.id} className={`rounded-xl px-3 py-2 text-sm ${entry.tone === 'success' ? 'bg-emerald-500/20 text-emerald-100' : entry.tone === 'warning' ? 'bg-amber-500/20 text-amber-100' : entry.tone === 'danger' ? 'bg-rose-500/20 text-rose-100' : 'bg-white/5 text-[#f6ebd3]'}`}>
                {entry.text}
              </p>
            )) : (
              <p className="text-sm text-[#ccb894]">Inicie a batalha para gerar eventos.</p>
            )}
          </div>

          {winner ? (
            <div className={`mt-3 rounded-2xl border p-3 ${winner === 'player' ? 'border-emerald-500/40 bg-emerald-500/15' : 'border-rose-500/40 bg-rose-500/15'}`}>
              <p className="text-lg font-black text-[#f8edd7]">{winner === 'player' ? 'Vitoria' : 'Derrota'}</p>
              <p className="text-sm text-[#e7d4ae]">{winner === 'player' ? 'Combate encerrado com sucesso.' : 'Tente outra combinacao de moves e troca.'}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

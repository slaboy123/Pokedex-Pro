import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { getAbilityByName, getMoveByName, getPokemonDetailBundle, getTypeByName } from '@/services/pokeapi';
import type { PokemonDetailBundle, PokemonSummary, TypeEffectiveness } from '@/types/pokemon';
import type { BattleMove } from '@/types/battle';
import { buildEffectiveness, capitalize, cleanText, formatId, toTitleCase } from '@/utils/pokemon';
import { getAnimatedSpriteUrl } from '@/utils/animatedSprites';
import { Modal } from '@/components/ui/Modal';
import { StatBars } from '@/features/pokemon/components/StatBars';
import { EvolutionTree } from '@/features/pokemon/components/EvolutionTree';
import { MoveList } from '@/features/pokemon/components/MoveList';
import { TypeEffectivenessPanel } from '@/features/pokemon/components/TypeEffectivenessPanel';
import { TypeBadge } from '@/features/pokemon/components/TypeBadge';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useTeamStore } from '@/store/teamStore';
import { useToastStore } from '@/store/toastStore';

interface PokemonDetailsModalProps {
  pokemon: PokemonSummary | null;
  onClose: () => void;
}

const mapStatName = (name: string): string => {
  const table: Record<string, string> = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Special Attack',
    'special-defense': 'Special Defense',
    speed: 'Speed',
  };
  return table[name] ?? toTitleCase(name);
};

const getDefaultAbilityDescription = async (abilityName: string): Promise<string> => {
  const ability = await getAbilityByName(abilityName);
  const englishText = ability.effect_entries.find((entry) => entry.language.name === 'en')?.short_effect;
  const fallback = ability.flavor_text_entries.find((entry) => entry.language.name === 'en')?.flavor_text;
  return cleanText(englishText ?? fallback ?? 'No description available.');
};

const findEvolutionNode = (node: PokemonDetailBundle['evolutionChain']['chain'], name: string): PokemonDetailBundle['evolutionChain']['chain'] | null => {
  if (node.species.name === name) {
    return node;
  }

  for (const child of node.evolves_to) {
    const found = findEvolutionNode(child, name);
    if (found) {
      return found;
    }
  }

  return null;
};

export const PokemonDetailsModal = ({ pokemon, onClose }: PokemonDetailsModalProps): JSX.Element | null => {
  const [bundle, setBundle] = useState<PokemonDetailBundle | null>(null);
  const [effectiveness, setEffectiveness] = useState<TypeEffectiveness>({ weaknesses: [], resistances: [], immunities: [] });
  const [moves, setMoves] = useState<BattleMove[]>([]);
  const [abilityDescriptions, setAbilityDescriptions] = useState<Record<string, string>>({});
  const [shiny, setShiny] = useState(false);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const addMember = useTeamStore((state) => state.addMember);
  const pushToast = useToastStore((state) => state.pushToast);

  useEffect(() => {
    if (!pokemon) {
      return;
    }

    let active = true;

    const load = async (): Promise<void> => {
      const details = await getPokemonDetailBundle(pokemon.id);
      const typeInfos = await Promise.all(details.pokemon.types.map((entry) => getTypeByName(entry.type.name)));
      const nextEffectiveness = typeInfos.reduce<TypeEffectiveness>(
        (accumulator, typeInfo) => {
          const built = buildEffectiveness(typeInfo.damage_relations);
          return {
            weaknesses: [...accumulator.weaknesses, ...built.weaknesses],
            resistances: [...accumulator.resistances, ...built.resistances],
            immunities: [...accumulator.immunities, ...built.immunities],
          };
        },
        { weaknesses: [], resistances: [], immunities: [] },
      );

      const selectedMoves = details.pokemon.moves
        .map((moveSlot) => moveSlot.move.name)
        .slice(0, 8);

      const moveDetails = await Promise.all(
        selectedMoves.map(async (moveName) => {
          const move = await getMoveByName(moveName);
          return {
            name: capitalize(move.name.replace(/-/g, ' ')),
            type: move.type.name,
            power: move.power ?? 40,
            accuracy: move.accuracy ?? 100,
            pp: move.pp ?? null,
            priority: move.priority,
            effect: cleanText(move.effect_entries.find((entry) => entry.language.name === 'en')?.short_effect ?? 'A reliable move.'),
          } satisfies BattleMove;
        }),
      );

      const descriptions: Record<string, string> = {};
      await Promise.all(
        details.pokemon.abilities.map(async (ability) => {
          descriptions[ability.ability.name] = await getDefaultAbilityDescription(ability.ability.name);
        }),
      );

      if (!active) {
        return;
      }

      setBundle(details);
      setEffectiveness({
        weaknesses: [...new Set(nextEffectiveness.weaknesses)],
        resistances: [...new Set(nextEffectiveness.resistances)],
        immunities: [...new Set(nextEffectiveness.immunities)],
      });
      setMoves(moveDetails);
      setAbilityDescriptions(descriptions);
      setShiny(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [pokemon]);

  const selectedEvolution = useMemo(() => {
    if (!bundle) {
      return null;
    }

    return findEvolutionNode(bundle.evolutionChain.chain, bundle.summary.name.toLowerCase());
  }, [bundle]);

  const handleFavorite = (): void => {
    if (!pokemon) {
      return;
    }

    toggleFavorite(pokemon.id);
    pushToast({
      title: 'Favorites',
      message: `${pokemon.name} atualizado nos favoritos.`,
      tone: 'success',
    });
  };

  const handleTeam = (): void => {
    if (!pokemon || !bundle) {
      return;
    }

    const added = addMember(bundle.summary);
    pushToast({
      title: added ? 'Team updated' : 'Team full',
      message: added ? `${pokemon.name} adicionado ao time.` : 'Seu time já está completo.',
      tone: added ? 'success' : 'warning',
    });
  };

  return (
    <Modal open={Boolean(pokemon)} title={pokemon ? `${pokemon.name} ${formatId(pokemon.id)}` : undefined} onClose={onClose}>
      {bundle ? (
        <div className="space-y-6 text-[#f6ebd3]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <section className="rpg-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-neon-green">Pokédex Entry</p>
                  <h3 className="mt-2 text-2xl font-extrabold text-[#f8edd7]">{bundle.summary.name}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bundle.summary.types.map((type) => (
                    <TypeBadge key={type} type={type} />
                  ))}
                </div>
              </div>

              <motion.div className="mt-5 rounded-3xl border border-neon-purple/25 bg-black/20 p-6" layout>
                <div className="mx-auto flex items-center justify-center" style={{ width: 192, height: 192 }}>
                  <img
                    src={getAnimatedSpriteUrl(bundle.summary.name, shiny)}
                    alt={bundle.summary.name}
                    className="drop-shadow-[0_24px_40px_rgba(0,0,0,0.45)]"
                    style={{
                      imageRendering: 'crisp-edges',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      // Fallback para sprite estática se animada falhar
                      (e.target as HTMLImageElement).src = shiny ? bundle.summary.shinySprite : bundle.summary.sprite;
                    }}
                  />
                </div>
              </motion.div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShiny((value) => !value)}
                  className="rounded-full border border-neon-green/30 bg-black/20 px-4 py-2 text-sm font-bold text-[#f6ebd3] transition hover:border-neon-green/70 hover:bg-black/35"
                >
                  {shiny ? 'Mostrar normal' : 'Mostrar shiny'}
                </button>
                <button
                  type="button"
                  onClick={handleFavorite}
                  className="rounded-full border border-neon-purple bg-neon-purple px-4 py-2 text-sm font-bold text-[#f8edd7] transition hover:brightness-110"
                >
                  Favoritar
                </button>
                <button
                  type="button"
                  onClick={handleTeam}
                  className="rounded-full border border-neon-green bg-neon-green px-4 py-2 text-sm font-bold text-[#24190e] transition hover:brightness-110"
                >
                  Adicionar ao time
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-[#dfcca8] md:grid-cols-4">
                <div className="rounded-2xl border border-neon-green/20 bg-black/20 p-3">
                  <p className="text-xs uppercase text-[#a99470]">Height</p>
                  <p className="mt-1 font-bold">{(bundle.pokemon.height / 10).toFixed(1)} m</p>
                </div>
                <div className="rounded-2xl border border-neon-green/20 bg-black/20 p-3">
                  <p className="text-xs uppercase text-[#a99470]">Weight</p>
                  <p className="mt-1 font-bold">{(bundle.pokemon.weight / 10).toFixed(1)} kg</p>
                </div>
                <div className="rounded-2xl border border-neon-green/20 bg-black/20 p-3">
                  <p className="text-xs uppercase text-[#a99470]">Base XP</p>
                  <p className="mt-1 font-bold">{bundle.pokemon.base_experience ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-neon-green/20 bg-black/20 p-3">
                  <p className="text-xs uppercase text-[#a99470]">Sum</p>
                  <p className="mt-1 font-bold">{bundle.pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)}</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rpg-panel">
                <p className="text-xs uppercase tracking-[0.25em] text-neon-purple">Abilities</p>
                <div className="mt-4 space-y-3">
                  {bundle.pokemon.abilities.map((ability) => (
                    <div key={ability.ability.name} className="rounded-2xl border border-neon-green/20 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold capitalize text-[#f8edd7]">{ability.ability.name.replace(/-/g, ' ')}</p>
                        {ability.is_hidden ? <span className="rounded-full bg-neon-purple/20 px-2 py-1 text-xs text-neon-purple">Hidden</span> : null}
                      </div>
                      <p className="mt-2 text-sm text-[#dcc79f]">{abilityDescriptions[ability.ability.name] ?? 'Loading description...'}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rpg-panel">
                <p className="text-xs uppercase tracking-[0.25em] text-neon-green">Flavor text</p>
                <p className="mt-3 text-sm leading-6 text-[#dfcca8]">
                  {cleanText(bundle.species.flavor_text_entries.find((entry) => entry.language.name === 'en')?.flavor_text ?? 'No flavor text available.')}
                </p>
              </div>
            </section>
          </div>

          <section className="rpg-panel">
            <p className="text-xs uppercase tracking-[0.25em] text-neon-green">Stats</p>
            <div className="mt-4">
              <StatBars
                stats={bundle.pokemon.stats.map((stat) => ({
                  name: mapStatName(stat.stat.name),
                  value: stat.base_stat,
                  max: 255,
                }))}
              />
            </div>
          </section>

          <section className="rpg-panel">
            <p className="text-xs uppercase tracking-[0.25em] text-neon-purple">Type effectiveness</p>
            <div className="mt-4">
              <TypeEffectivenessPanel effectiveness={effectiveness} />
            </div>
          </section>

          <section className="rpg-panel">
            <p className="text-xs uppercase tracking-[0.25em] text-neon-green">Evolution tree</p>
            <div className="mt-4 overflow-x-auto">
              {selectedEvolution ? <EvolutionTree chain={selectedEvolution} onSelect={() => undefined} /> : <p className="text-sm text-[#ccb894]">No evolution chain available.</p>}
            </div>
          </section>

          <section className="rpg-panel">
            <p className="text-xs uppercase tracking-[0.25em] text-neon-green">Battle moves</p>
            <div className="mt-4">
              <MoveList moves={moves} />
            </div>
          </section>
        </div>
      ) : (
        <div className="rpg-panel p-6 text-[#dfcca8]">Carregando detalhes...</div>
      )}
    </Modal>
  );
};
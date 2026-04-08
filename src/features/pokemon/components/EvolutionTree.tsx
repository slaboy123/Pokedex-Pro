import { motion } from 'framer-motion';
import type { EvolutionChainLink } from '@/types/pokemon';
import { toTitleCase } from '@/utils/pokemon';

interface EvolutionTreeProps {
  chain: EvolutionChainLink;
  onSelect: (name: string) => void;
}

const Node = ({ node, onSelect, depth = 0 }: { node: EvolutionChainLink; onSelect: (name: string) => void; depth?: number }): JSX.Element => {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        type="button"
        onClick={() => onSelect(node.species.name)}
        className="min-w-28 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-neon-purple/40 hover:bg-white/10"
        whileHover={{ y: -2, scale: 1.02 }}
      >
        {toTitleCase(node.species.name)}
      </motion.button>
      {node.evolves_to.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-4 border-l border-dashed border-white/20 pl-4 md:border-l-0 md:border-t md:pl-0 md:pt-4">
          {node.evolves_to.map((child) => (
            <Node key={`${node.species.name}-${child.species.name}`} node={child} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const EvolutionTree = ({ chain, onSelect }: EvolutionTreeProps): JSX.Element => {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      <Node node={chain} onSelect={onSelect} />
    </div>
  );
};
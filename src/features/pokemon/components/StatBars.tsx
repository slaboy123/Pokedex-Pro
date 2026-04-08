import { motion } from 'framer-motion';

interface StatItem {
  name: string;
  value: number;
  max: number;
}

interface StatBarsProps {
  stats: StatItem[];
}

export const StatBars = ({ stats }: StatBarsProps): JSX.Element => {
  return (
    <div className="space-y-3">
      {stats.map((stat, index) => {
        const percent = Math.min(100, Math.round((stat.value / stat.max) * 100));
        return (
          <div key={stat.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-white/90">{stat.name}</span>
              <span className="text-xs text-white/60">{stat.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-neon-green via-neon-cyan to-neon-purple"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.65, delay: index * 0.06 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
import type { AppView } from '@/types/app';
import { BattleView } from '@/features/battle/battle-ui';

interface BattleSimulatorProps {
  onViewChange: (view: AppView) => void;
}

export const BattleSimulator = ({ onViewChange }: BattleSimulatorProps): JSX.Element => {
  return <BattleView onViewChange={onViewChange} />;
};

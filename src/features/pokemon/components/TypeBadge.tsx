import { capitalize } from '@/utils/pokemon';

interface TypeBadgeProps {
  type: string;
}

export const TypeBadge = ({ type }: TypeBadgeProps): JSX.Element => {
  return (
    <span className="inline-flex items-center rounded-full border border-rose-300/35 bg-[#1b0b0d] px-2.5 py-1 text-xs font-bold text-[#f3d9dc]">
      {capitalize(type)}
    </span>
  );
};
import { capitalize } from '@/utils/pokemon';

interface TypeBadgeProps {
  type: string;
}

const TYPE_STYLES: Record<string, string> = {
  normal: 'border-[#A8A77A] bg-[#A8A77A]/30 text-[#F8F7D5]',
  fire: 'border-[#EE8130] bg-[#EE8130]/28 text-[#FFE7D2]',
  water: 'border-[#6390F0] bg-[#6390F0]/28 text-[#DCE6FF]',
  electric: 'border-[#F7D02C] bg-[#F7D02C]/28 text-[#FFF7C9]',
  grass: 'border-[#7AC74C] bg-[#7AC74C]/28 text-[#E8FFD8]',
  ice: 'border-[#96D9D6] bg-[#96D9D6]/28 text-[#E6FFFF]',
  fighting: 'border-[#C22E28] bg-[#C22E28]/28 text-[#FFE1DF]',
  poison: 'border-[#A33EA1] bg-[#A33EA1]/28 text-[#F9D9F9]',
  ground: 'border-[#E2BF65] bg-[#E2BF65]/28 text-[#FFF1C9]',
  flying: 'border-[#A98FF3] bg-[#A98FF3]/28 text-[#ECE3FF]',
  psychic: 'border-[#F95587] bg-[#F95587]/28 text-[#FFE0EB]',
  bug: 'border-[#A6B91A] bg-[#A6B91A]/28 text-[#F4FBC9]',
  rock: 'border-[#B6A136] bg-[#B6A136]/28 text-[#FFF5CC]',
  ghost: 'border-[#735797] bg-[#735797]/28 text-[#EADFFF]',
  dragon: 'border-[#6F35FC] bg-[#6F35FC]/28 text-[#E9DFFF]',
  dark: 'border-[#705746] bg-[#705746]/28 text-[#F0E6DE]',
  steel: 'border-[#B7B7CE] bg-[#B7B7CE]/28 text-[#F4F4FF]',
  fairy: 'border-[#D685AD] bg-[#D685AD]/28 text-[#FFE6F2]',
};

export const TypeBadge = ({ type }: TypeBadgeProps): JSX.Element => {
  const normalizedType = type.toLowerCase();
  const palette = TYPE_STYLES[normalizedType] ?? 'border-rose-300/35 bg-[#1b0b0d] text-[#f3d9dc]';

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold shadow-[0_0_0_1px_rgba(0,0,0,0.18)] ${palette}`}>
      {capitalize(type)}
    </span>
  );
};
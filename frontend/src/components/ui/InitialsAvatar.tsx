import { initialsOf } from '../../lib/format';

interface InitialsAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
};

export function InitialsAvatar({ name, size = 'md' }: InitialsAvatarProps) {
  return (
    <div
      className={`${SIZE_MAP[size]} rounded-lg bg-[#E6F4F4] text-[#0B6E6E] font-semibold flex items-center justify-center flex-shrink-0 select-none`}
      aria-label={name}
    >
      {initialsOf(name)}
    </div>
  );
}

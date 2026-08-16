import React from 'react';
import { cn } from '@/utils/cn';
import { CareAvatar } from './CareAvatar';

export interface AvatarGroupItem {
  name: string;
  src?: string;
}

export interface AvatarGroupProps {
  avatars: AvatarGroupItem[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 3,
  size = 'md',
  className,
}) => {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className={cn('flex items-center -space-x-3', className)}>
      {visible.map((item, idx) => (
        <CareAvatar
          key={idx}
          name={item.name}
          src={item.src}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {overflow > 0 && (
        <div className="w-10 h-10 rounded-full bg-[#16866B] text-white font-bold text-xs flex items-center justify-center ring-2 ring-white shadow-care-sm select-none">
          +{overflow}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { cn } from '@/utils/cn';
import { CareAvatar } from './CareAvatar';
import { ShieldCheck, Heart, UserCheck } from 'lucide-react';

export interface CareMemberAvatarProps {
  name: string;
  role: 'PRIMARY_GUARDIAN' | 'FAMILY' | 'VOLUNTEER' | 'ADMIN';
  src?: string;
  isAvailable?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CareMemberAvatar: React.FC<CareMemberAvatarProps> = ({
  name,
  role,
  src,
  isAvailable = true,
  size = 'lg',
  className,
}) => {
  const roleBadges = {
    PRIMARY_GUARDIAN: <ShieldCheck className="w-4 h-4 text-[#16866B]" />,
    FAMILY: <Heart className="w-4 h-4 text-[#EC4899]" />,
    VOLUNTEER: <UserCheck className="w-4 h-4 text-[#0284C7]" />,
    ADMIN: <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />,
  };

  return (
    <div className={cn('relative inline-flex items-center gap-3', className)}>
      <div className="relative">
        <CareAvatar name={name} src={src} size={size} status={isAvailable ? 'online' : 'offline'} />
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-[#E5E7E5]">
          {roleBadges[role]}
        </div>
      </div>
      <div>
        <h4 className="font-bold text-[#1D2926] text-base leading-tight">{name}</h4>
        <span className="text-xs text-[#66736F] capitalize">{role.replace(/_/g, ' ').toLowerCase()}</span>
      </div>
    </div>
  );
};

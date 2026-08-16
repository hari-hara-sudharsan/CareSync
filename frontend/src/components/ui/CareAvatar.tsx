import React from 'react';
import { cn } from '@/utils/cn';
import { User } from 'lucide-react';

export interface CareAvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'busy' | 'offline';
  className?: string;
}

export const CareAvatar: React.FC<CareAvatarProps> = ({
  src,
  name,
  size = 'lg',
  status,
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);

  const getInitials = (n?: string) => {
    if (!n) return '';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg font-bold',
    xl: 'w-18 h-18 text-xl font-bold',
    '2xl': 'w-24 h-24 text-2xl font-extrabold',
  };

  const statusDotSizes = {
    sm: 'w-2.5 h-2.5 right-0 bottom-0 border',
    md: 'w-3 h-3 right-0 bottom-0 border-2',
    lg: 'w-4 h-4 right-0 bottom-0 border-2',
    xl: 'w-5 h-5 right-0.5 bottom-0.5 border-2',
    '2xl': 'w-6 h-6 right-1 bottom-1 border-3',
  };

  const statusColors = {
    online: 'bg-[#16866B]',
    busy: 'bg-[#F59E0B]',
    offline: 'bg-[#94A3B8]',
  };

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center bg-[#E8F4EF] text-[#16866B] font-semibold ring-2 ring-white shadow-care-sm select-none',
          sizes[size],
          className
        )}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : name ? (
          <span>{getInitials(name)}</span>
        ) : (
          <User className="w-1/2 h-1/2 text-[#16866B]" />
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute rounded-full border-white shadow-sm',
            statusColors[status],
            statusDotSizes[size]
          )}
        />
      )}
    </div>
  );
};

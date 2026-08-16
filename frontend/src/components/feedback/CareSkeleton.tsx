import React from 'react';
import { cn } from '@/utils/cn';

export interface CareSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'circle' | 'button';
}

export const CareSkeleton: React.FC<CareSkeletonProps> = ({
  variant = 'text',
  className,
  ...props
}) => {
  const base = 'animate-pulse bg-[#E5E7E5] rounded-xl';

  const variants = {
    text: 'h-5 w-full',
    card: 'h-36 w-full rounded-[24px]',
    circle: 'w-14 h-14 rounded-full',
    button: 'h-12 w-32 rounded-2xl',
  };

  return <div className={cn(base, variants[variant], className)} {...props} />;
};

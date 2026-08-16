import React from 'react';
import { cn } from '@/utils/cn';
import { CareAvatar } from '@/components/ui/CareAvatar';
import { CareIconButton } from '@/components/ui/CareIconButton';
import { Bell, CloudRain, Settings } from 'lucide-react';

export interface CareTopBarProps {
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
  weatherTemp?: string;
  weatherCondition?: string;
  dateString?: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

export const CareTopBar: React.FC<CareTopBarProps> = ({
  userName = 'Susan Woodson',
  userRole = 'Parent Member',
  avatarUrl,
  weatherTemp = '18° C',
  weatherCondition = 'Rainy',
  dateString = 'Friday, Feb 23',
  notificationCount = 2,
  onNotificationClick,
  onSettingsClick,
  className,
}) => {
  return (
    <header
      className={cn(
        'w-full bg-[#FAF7F1]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3 border-b border-[#EBE5D8] flex items-center justify-between gap-4',
        className
      )}
    >
      {/* Left: Weather & Date pill (From Reference Image 1) */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-[#E8F4EF] border border-[#16866B]/20 text-[#16866B] px-3.5 py-1.5 rounded-full text-xs font-semibold">
          <CloudRain className="w-4 h-4 text-[#16866B]" />
          <span>{weatherTemp} {weatherCondition}</span>
          <span className="text-[#8E9B97]">|</span>
          <span>{dateString}</span>
        </div>

        {/* Mobile branding */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#16866B] text-white flex items-center justify-center font-black text-lg shadow-care-sm">
            C
          </div>
          <span className="font-extrabold text-xl text-[#1D2926] tracking-tight">CareSync</span>
        </div>
      </div>

      {/* Center/Right: User Avatar & Role */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-[#E5E7E5] shadow-care-sm">
          <CareAvatar src={avatarUrl} name={userName} size="sm" status="online" />
          <div className="hidden md:block text-left pr-2">
            <p className="text-sm font-bold text-[#1D2926] leading-tight">{userName}</p>
            <p className="text-xs text-[#66736F] leading-tight">{userRole}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <CareIconButton
          variant="soft"
          size="md"
          icon={<Bell className="w-5 h-5 text-[#16866B]" />}
          badgeCount={notificationCount}
          label="Notifications"
          onClick={onNotificationClick}
        />

        <CareIconButton
          variant="ghost"
          size="md"
          icon={<Settings className="w-5 h-5 text-[#66736F]" />}
          label="Settings"
          onClick={onSettingsClick}
        />
      </div>
    </header>
  );
};

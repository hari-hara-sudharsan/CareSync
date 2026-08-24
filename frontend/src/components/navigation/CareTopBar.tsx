import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { CareAvatar } from '@/components/ui/CareAvatar';
import { CareIconButton } from '@/components/ui/CareIconButton';
import { CareBadge } from '@/components/ui/CareBadge';
import { notificationService, type UserNotificationItem } from '@/services/notificationService';
import { Bell, CloudRain, Settings, X, CheckCircle2, Clock } from 'lucide-react';

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
  notificationCount: propNotificationCount,
  onNotificationClick,
  onSettingsClick,
  className,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(propNotificationCount ?? 0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count);
    } catch {
      console.warn('Failed to fetch notifications');
    }
  };

  const handleToggleDrawer = () => {
    if (onNotificationClick) {
      onNotificationClick();
    }
    setIsDrawerOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleNavigateSettings = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      window.location.hash = '#/settings';
    }
  };

  return (
    <>
      <header
        className={cn(
          'w-full bg-[#FAF7F1]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3 border-b border-[#EBE5D8] flex items-center justify-between gap-4',
          className
        )}
      >
        {/* Left: Weather & Date pill */}
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
            badgeCount={unreadCount}
            label="Notifications"
            onClick={handleToggleDrawer}
          />

          <CareIconButton
            variant="ghost"
            size="md"
            icon={<Settings className="w-5 h-5 text-[#66736F]" />}
            label="Settings"
            onClick={handleNavigateSettings}
          />
        </div>
      </header>

      {/* Notification Center Slide-Out Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[#FAF7F1] h-full shadow-2xl border-l border-[#EBE5D8] flex flex-col justify-between p-6 space-y-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-[#16866B]" />
                  <h3 className="text-lg font-bold text-[#1D2926]">CareSync Notifications</h3>
                  {unreadCount > 0 && (
                    <CareBadge variant="info">{unreadCount} New</CareBadge>
                  )}
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-full text-[#66736F] hover:bg-[#E8F4EF] hover:text-[#1D2926]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="py-12 text-center text-[#66736F] text-sm font-semibold">
                  No notifications recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-4 rounded-2xl border text-left space-y-2 transition-all',
                        item.status === 'SENT'
                          ? 'bg-white border-[#16866B]/30 shadow-care-sm'
                          : 'bg-[#FAF7F1] border-[#E5E7E5] opacity-80'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#16866B]">
                          {item.subject}
                        </span>
                        {item.status === 'SENT' ? (
                          <button
                            onClick={() => handleMarkAsRead(item.id)}
                            className="text-[11px] font-bold text-[#16866B] hover:underline"
                          >
                            Mark Read ✓
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Read
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#1D2926] leading-relaxed">{item.body}</p>
                      <div className="text-[10px] text-[#66736F] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#CBD5E1] flex justify-end">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 bg-[#16866B] text-white rounded-xl text-xs font-bold shadow-care-sm hover:bg-[#126E58]"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { cn } from '@/utils/cn';
import { Home, HeartHandshake, Users, ShieldAlert, CheckSquare } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface CareBottomNavigationProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  items?: NavItem[];
  className?: string;
}

export const CareBottomNavigation: React.FC<CareBottomNavigationProps> = ({
  activeTab,
  onTabChange,
  items,
  className,
}) => {
  const defaultItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-6 h-6" /> },
    { id: 'care', label: 'Care Requests', icon: <HeartHandshake className="w-6 h-6" /> },
    { id: 'decisions', label: 'Decisions', icon: <CheckSquare className="w-6 h-6" />, badge: 1 },
    { id: 'team', label: 'Care Circle', icon: <Users className="w-6 h-6" /> },
    { id: 'safety', label: 'Safety', icon: <ShieldAlert className="w-6 h-6" /> },
  ];

  const navItems = items || defaultItems;

  const getActiveTabFromHash = (): string => {
    if (typeof window === 'undefined') return activeTab || 'home';
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === '/parent/home' || hash === '/home') return 'home';
    if (hash === '/parent/care-log' || hash === '/family/requests') return 'care';
    if (hash === '/admin/dashboard' || hash === '/decisions') return 'decisions';
    if (hash === '/parent/care-team') return 'team';
    if (hash === '/parent/check-in') return 'safety';
    return activeTab || 'home';
  };

  const currentActive = getActiveTabFromHash();

  const handleItemClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }

    const routeMap: Record<string, string> = {
      home: '/parent/home',
      care: '/parent/care-log',
      decisions: '/family/requests',
      team: '/parent/care-team',
      safety: '/parent/check-in',
    };

    const targetRoute = routeMap[tabId];
    if (targetRoute && typeof window !== 'undefined') {
      window.location.hash = `#${targetRoute}`;
    }
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t-2 border-[#EBE5D8] px-2 py-2 sm:py-3 shadow-care-lg',
        className
      )}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentActive === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                'flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[64px] min-h-[52px] relative focus-care select-none cursor-pointer',
                isActive
                  ? 'bg-[#E8F4EF] text-[#16866B] font-bold scale-105'
                  : 'text-[#66736F] hover:text-[#1D2926] hover:bg-[#FAF7F1]'
              )}
            >
              <div className="relative">
                {item.icon}
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Pill,
  ShieldCheck,
  Users,
  HeartHandshake,
  History,
  AlertTriangle,
  Settings,
} from 'lucide-react';

export interface FamilySidebarProps {
  activeRoute?: string;
  onNavigate?: (route: string) => void;
  attentionCount?: number;
}

export const FamilySidebar: React.FC<FamilySidebarProps> = ({
  activeRoute = '/family/home',
  onNavigate,
  attentionCount = 0,
}) => {
  const handleNav = (route: string, isSupported = false) => {
    if (!isSupported) return;
    if (onNavigate) {
      onNavigate(route);
    } else {
      window.location.hash = `#${route}`;
    }
  };

  interface NavItem {
    label: string;
    route: string;
    icon: React.ReactNode;
    isSupported: boolean;
    badge?: number;
  }

  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          label: 'Dashboard',
          route: '/family/home',
          icon: <LayoutDashboard className="w-5 h-5" />,
          isSupported: true,
          badge: attentionCount > 0 ? attentionCount : undefined,
        },
      ],
    },
    {
      title: 'CARE MANAGEMENT',
      items: [
        { label: 'Care Requests', route: '/family/requests', icon: <FileText className="w-5 h-5" />, isSupported: true },
        { label: 'Appointments', route: '/family/appointments', icon: <Calendar className="w-5 h-5" />, isSupported: false },
        { label: 'Medications', route: '/family/medications', icon: <Pill className="w-5 h-5" />, isSupported: false },
        { label: 'Safety Check-Ins', route: '/family/check-ins', icon: <ShieldCheck className="w-5 h-5" />, isSupported: false },
      ],
    },
    {
      title: 'PEOPLE & NETWORK',
      items: [
        { label: 'Care Team', route: '/family/care-team', icon: <Users className="w-5 h-5" />, isSupported: false },
        { label: 'Community Volunteers', route: '/family/volunteers', icon: <HeartHandshake className="w-5 h-5" />, isSupported: false },
      ],
    },
    {
      title: 'LOGS & SAFETY',
      items: [
        { label: 'Care Log & Activity', route: '/family/care-log', icon: <History className="w-5 h-5" />, isSupported: false },
        { label: 'Safety Concerns', route: '/family/concerns', icon: <AlertTriangle className="w-5 h-5" />, isSupported: false },
        { label: 'Settings', route: '/settings', icon: <Settings className="w-5 h-5" />, isSupported: true },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7E5] flex flex-col justify-between hidden lg:flex shrink-0 min-h-screen text-left">
      <div className="p-5 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-[#16866B] text-white flex items-center justify-center font-black text-xl shadow-care-sm">
            C
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-[#1D2926] block leading-none">
              CareSync
            </span>
            <span className="text-xs font-bold text-[#16866B] uppercase tracking-wider block mt-1">
              Caregiver Workspace
            </span>
          </div>
        </div>

        {/* Nav Sections */}
        <nav className="space-y-6">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1.5">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#8E9B97] px-2">
                {sec.title}
              </h4>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const isActive = activeRoute === item.route;
                  return (
                    <button
                      key={item.route}
                      onClick={() => handleNav(item.route, item.isSupported)}
                      disabled={!item.isSupported}
                      className={`w-full px-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-between transition-all focus-care ${
                        isActive
                          ? 'bg-[#E8F4EF] text-[#16866B] shadow-care-sm'
                          : item.isSupported
                          ? 'text-[#1D2926] hover:bg-[#FAF7F1]'
                          : 'text-[#94A3B8] opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isActive ? 'text-[#16866B]' : 'text-[#66736F]'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="bg-[#DC2626] text-white text-xs px-2 py-0.5 rounded-full font-extrabold shadow-care-sm">
                          {item.badge}
                        </span>
                      )}

                      {!item.isSupported && (
                        <span className="text-[10px] uppercase font-semibold text-[#94A3B8] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Caregiver Context */}
      <div className="p-4 border-t border-[#E5E7E5] bg-[#FAF7F1]">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 text-left">
            <p className="text-sm font-extrabold text-[#1D2926]">David Woodson</p>
            <p className="text-xs text-[#66736F]">Primary Care Guardian</p>
          </div>
          <button
            onClick={() => handleNav('/parent/home', true)}
            className="text-xs font-bold text-[#16866B] hover:underline"
            title="Switch to Parent View"
          >
            Parent View
          </button>
        </div>
      </div>
    </aside>
  );
};

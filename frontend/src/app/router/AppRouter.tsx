import React, { useState, useEffect } from 'react';
import { ParentWelcomePage } from '@/features/parent/ParentWelcomePage';
import { ParentLoginPage } from '@/features/parent/auth/ParentLoginPage';
import { ParentOnboardingPage } from '@/features/parent/onboarding/ParentOnboardingPage';
import { ParentHomePage } from '@/features/parent/home/ParentHomePage';
import { ParentCheckInPage } from '@/features/parent/checkin/ParentCheckInPage';
import { ParentMedicationPage } from '@/features/parent/medication/ParentMedicationPage';
import { ParentAppointmentPage } from '@/features/parent/appointment/ParentAppointmentPage';
import { ParentCareTeamPage } from '@/features/parent/care-team/ParentCareTeamPage';
import { ParentCareLogPage } from '@/features/parent/care-log/ParentCareLogPage';
import { FamilyHomePage } from '@/features/family/home/FamilyHomePage';
import { FamilyCareRequestsPage } from '@/features/family/requests/FamilyCareRequestsPage';
import { VolunteerHomePage } from '@/features/volunteer/VolunteerHomePage';
import { CoordinatorAdminPage } from '@/features/admin/CoordinatorAdminPage';
import { DesignSystemPage } from '@/features/admin/DesignSystemPage';

export const AppRouter: React.FC = () => {
  const getInitialPath = () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) return hash;
    const pathname = window.location.pathname;
    if (pathname === '/design-system') return '/design-system';
    if (pathname === '/parent/login') return '/parent/login';
    if (pathname === '/parent/onboarding') return '/parent/onboarding';
    if (pathname === '/parent/home') return '/parent/home';
    if (pathname === '/parent/check-in') return '/parent/check-in';
    if (pathname === '/parent/medication') return '/parent/medication';
    if (pathname === '/parent/appointment') return '/parent/appointment';
    if (pathname === '/parent/care-team') return '/parent/care-team';
    if (pathname === '/parent/care-log') return '/parent/care-log';
    if (pathname === '/family/home') return '/family/home';
    if (pathname === '/family/requests') return '/family/requests';
    if (pathname === '/volunteer/home') return '/volunteer/home';
    if (pathname === '/admin/dashboard') return '/admin/dashboard';
    return '/parent/welcome';
  };

  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getInitialPath());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.location.hash = `#${path}`;
    window.history.pushState({}, '', `#${path}`);
  };

  const renderContent = () => {
    if (currentPath === '/design-system') return <DesignSystemPage />;
    if (currentPath === '/parent/login') return <ParentLoginPage onNavigate={navigate} />;
    if (currentPath === '/parent/onboarding') return <ParentOnboardingPage onNavigate={navigate} />;
    if (currentPath === '/parent/home') return <ParentHomePage onNavigate={navigate} />;
    if (currentPath === '/parent/check-in') return <ParentCheckInPage onNavigate={navigate} />;
    if (currentPath === '/parent/medication') return <ParentMedicationPage onNavigate={navigate} />;
    if (currentPath === '/parent/appointment') return <ParentAppointmentPage onNavigate={navigate} />;
    if (currentPath === '/parent/care-team') return <ParentCareTeamPage onNavigate={navigate} />;
    if (currentPath === '/parent/care-log') return <ParentCareLogPage onNavigate={navigate} />;
    if (currentPath === '/family/home') return <FamilyHomePage onNavigate={navigate} />;
    if (currentPath === '/family/requests') return <FamilyCareRequestsPage onNavigate={navigate} />;
    if (currentPath === '/volunteer/home') return <VolunteerHomePage onNavigate={navigate} />;
    if (currentPath === '/admin/dashboard') return <CoordinatorAdminPage onNavigate={navigate} />;
    return <ParentWelcomePage onNavigate={navigate} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      {/* Top Workspace Persona Switcher Bar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-teal-400 text-sm tracking-wide">CareSync Workspace</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-medium">Persona Persona Integration</span>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => navigate('/parent/home')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              currentPath.startsWith('/parent')
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            👵 Parent
          </button>
          <button
            onClick={() => navigate('/family/home')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              currentPath.startsWith('/family')
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            👨‍👩‍👧 Family
          </button>
          <button
            onClick={() => navigate('/volunteer/home')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              currentPath.startsWith('/volunteer')
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            🤝 Volunteer
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              currentPath.startsWith('/admin')
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            ⚙️ Admin
          </button>
        </div>
      </header>

      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
};

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
import { authService } from '@/services/authService';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!authService.getToken());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getInitialPath());
      setIsAuthenticated(!!authService.getToken());
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
    setIsAuthenticated(!!authService.getToken());
  };

  const isPublicRoute = (path: string) => {
    return path === '/parent/welcome' || path === '/parent/login' || path === '/design-system';
  };

  const renderContent = () => {
    // Route Guard: Redirect unauthenticated requests to login
    if (!isAuthenticated && !isPublicRoute(currentPath)) {
      return <ParentLoginPage onNavigate={navigate} />;
    }

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
      {/* Top Session Header Bar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-teal-400 text-sm tracking-wide">CareSync Workspace</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-medium">
            {isAuthenticated ? '🔒 Session Authenticated' : '👤 Guest / Unauthenticated'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isAuthenticated ? (
            <button
              onClick={() => {
                authService.logout();
                navigate('/parent/login');
              }}
              className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg font-bold hover:bg-red-500/30 transition-all"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => navigate('/parent/login')}
              className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-lg font-bold hover:bg-teal-500/30 transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
};

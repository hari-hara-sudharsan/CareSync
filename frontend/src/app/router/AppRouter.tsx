import React, { useState, useEffect, useCallback } from 'react';
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
import { SettingsPage } from '@/features/settings/SettingsPage';
import { authService } from '@/services/authService';
import type { AuthUser } from '@/types/auth';
import { ShieldCheck, UserCheck, LogOut, AlertCircle, RefreshCw, Settings } from 'lucide-react';

export const AppRouter: React.FC = () => {
  const getInitialPath = () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) return hash;
    const pathname = window.location.pathname;
    if (pathname === '/design-system') return '/design-system';
    if (pathname === '/settings') return '/settings';
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  const fetchUserIdentity = useCallback(async () => {
    const token = authService.getToken();
    if (!token) {
      setCurrentUser(null);
      setIsLoadingUser(false);
      return;
    }

    try {
      setIsLoadingUser(true);
      const user = await authService.getMe();
      setCurrentUser(user);
    } catch {
      authService.clearToken();
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    fetchUserIdentity();
  }, [fetchUserIdentity]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getInitialPath());
      fetchUserIdentity();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [fetchUserIdentity]);

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.location.hash = `#${path}`;
    window.history.pushState({}, '', `#${path}`);
    fetchUserIdentity();
  };

  const isPublicRoute = (path: string) => {
    return path === '/parent/welcome' || path === '/parent/login' || path === '/design-system';
  };

  // Authoritative Role Workspace Routing & Access Policy
  const isRouteAuthorizedForRole = (path: string, user: AuthUser | null): boolean => {
    if (isPublicRoute(path)) return true;
    if (!user) return false;

    const role = (user.role || 'FAMILY').toUpperCase();
    if (role === 'ADMIN' || role === 'COORDINATOR') return true;

    if (path.startsWith('/parent/')) {
      return role === 'PARENT' || role === 'PRIMARY_GUARDIAN' || role === 'FAMILY';
    }

    if (path.startsWith('/family/')) {
      return role === 'FAMILY' || role === 'PRIMARY_GUARDIAN' || role === 'PARENT';
    }

    if (path.startsWith('/volunteer/')) {
      return role === 'VOLUNTEER';
    }

    if (path.startsWith('/admin/')) {
      return role === 'ADMIN' || role === 'COORDINATOR';
    }

    return true;
  };

  const getDefaultWorkspaceForRole = (user: AuthUser): string => {
    const role = (user.role || 'FAMILY').toUpperCase();
    if (role === 'PARENT' || role === 'PRIMARY_GUARDIAN') return '/parent/home';
    if (role === 'VOLUNTEER') return '/volunteer/home';
    if (role === 'ADMIN' || role === 'COORDINATOR') return '/admin/dashboard';
    return '/family/home';
  };

  const renderContent = () => {
    if (isLoadingUser) {
      return (
        <div className="min-h-screen bg-[#FAF7F1] flex items-center justify-center p-6">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="w-10 h-10 text-[#16866B] animate-spin" />
            <p className="font-bold text-[#1D2926]">Verifying CareSync Session Identity...</p>
          </div>
        </div>
      );
    }

    // 1. Unauthenticated Route Guard
    if (!currentUser && !isPublicRoute(currentPath)) {
      return <ParentLoginPage onNavigate={navigate} />;
    }

    // 2. Role-Based Workspace Authorization Guard
    if (currentUser && !isRouteAuthorizedForRole(currentPath, currentUser)) {
      const allowedDefault = getDefaultWorkspaceForRole(currentUser);
      return (
        <div className="min-h-screen bg-[#FAF7F1] text-[#1D2926] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#E5E7E5] shadow-care-lg space-y-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-[#1D2926]">Access Restricted</h2>
              <p className="text-base text-[#66736F]">
                Your authenticated account (<span className="font-bold">{currentUser.full_name}</span>) has the role{' '}
                <span className="font-bold text-[#16866B] bg-[#E8F4EF] px-2 py-0.5 rounded">{currentUser.role}</span> and is not authorized to access <span className="font-bold">{currentPath}</span>.
              </p>
            </div>
            <button
              onClick={() => navigate(allowedDefault)}
              className="w-full py-3 bg-[#16866B] text-white font-extrabold rounded-2xl hover:bg-[#126E58] transition-all shadow-care-sm"
            >
              Return to Authorized {currentUser.role} Workspace
            </button>
          </div>
        </div>
      );
    }

    // 3. Render Authorized Workspace Component
    if (currentPath === '/design-system') return <DesignSystemPage />;
    if (currentPath === '/settings') return <SettingsPage onNavigate={navigate} />;
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
      {/* Authoritative Session Header Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-[#16866B] text-white flex items-center justify-center font-black text-xs">
              C
            </div>
            <span className="font-extrabold text-white text-sm tracking-wide">CareSync</span>
          </div>

          <span className="text-slate-700">|</span>

          {currentUser ? (
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200 font-bold">{currentUser.full_name}</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 font-extrabold text-[10px] uppercase border border-teal-800">
                {currentUser.role}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 font-medium">Unauthenticated Guest</span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {currentUser && (
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg font-bold hover:bg-slate-700 transition-all focus-care"
            >
              <Settings className="w-3.5 h-3.5 text-teal-400" />
              <span>Settings</span>
            </button>
          )}

          {currentUser ? (
            <button
              onClick={() => {
                authService.logout();
                setCurrentUser(null);
                navigate('/parent/login');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/60 text-red-300 border border-red-800/80 rounded-lg font-bold hover:bg-red-900/80 transition-all focus-care"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/parent/login')}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-950/60 text-teal-300 border border-teal-800/80 rounded-lg font-bold hover:bg-teal-900/80 transition-all focus-care"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Sign In</span>
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

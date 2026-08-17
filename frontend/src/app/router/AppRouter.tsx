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

  if (currentPath === '/design-system') {
    return <DesignSystemPage />;
  }

  if (currentPath === '/parent/login') {
    return <ParentLoginPage onNavigate={navigate} />;
  }

  if (currentPath === '/parent/onboarding') {
    return <ParentOnboardingPage onNavigate={navigate} />;
  }

  if (currentPath === '/parent/home') {
    return <ParentHomePage onNavigate={navigate} />;
  }

  if (currentPath === '/parent/check-in') {
    return <ParentCheckInPage onNavigate={navigate} />;
  }

  if (currentPath === '/parent/medication') {
    return <ParentMedicationPage onNavigate={navigate} />;
  }

  if (currentPath === '/parent/appointment') {
    return <ParentAppointmentPage onNavigate={navigate} />;
  }

  if (currentPath === '/parent/care-team') {
    return <ParentCareTeamPage onNavigate={navigate} />;
  }

  if (currentPath === '/parent/care-log') {
    return <ParentCareLogPage onNavigate={navigate} />;
  }

  return <ParentWelcomePage onNavigate={navigate} />;
};

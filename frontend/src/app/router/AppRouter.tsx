import React, { useState, useEffect } from 'react';
import { ParentWelcomePage } from '@/features/parent/ParentWelcomePage';
import { ParentLoginPage } from '@/features/parent/auth/ParentLoginPage';
import { ParentOnboardingPage } from '@/features/parent/onboarding/ParentOnboardingPage';
import { ParentHomePage } from '@/features/parent/home/ParentHomePage';
import { ParentCheckInPage } from '@/features/parent/checkin/ParentCheckInPage';
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

  return <ParentWelcomePage onNavigate={navigate} />;
};

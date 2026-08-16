import React, { useState, useEffect } from 'react';
import { ParentWelcomePage } from '@/features/parent/ParentWelcomePage';
import { ParentLoginPage } from '@/features/parent/auth/ParentLoginPage';
import { ParentOnboardingPlaceholder } from '@/features/parent/ParentOnboardingPlaceholder';
import { DesignSystemPage } from '@/features/admin/DesignSystemPage';

export const AppRouter: React.FC = () => {
  const getInitialPath = () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) return hash;
    const pathname = window.location.pathname;
    if (pathname === '/design-system') return '/design-system';
    if (pathname === '/parent/login') return '/parent/login';
    if (pathname === '/parent/onboarding') return '/parent/onboarding';
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
    return <ParentOnboardingPlaceholder onNavigate={navigate} />;
  }

  return <ParentWelcomePage onNavigate={navigate} />;
};

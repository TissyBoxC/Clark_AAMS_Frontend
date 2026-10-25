import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import type { IUserType } from '../types/app-types';

import { useAuthStore } from '../store/auth-context';
import { safeRedirect } from '../utils/navigation';

import { useTransitionNavigate } from './useTransitionNavigate';

export interface IRequiredUserResultType {
  user: IUserType;
  isReady: boolean;
}

export function useRequiredUser(): IRequiredUserResultType {
  const location = useLocation();
  const navigate = useTransitionNavigate();
  const { isAuthResolved, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthResolved || user.id > 0) {
      return;
    }

    const redirect = safeRedirect(
      `${location.pathname}${location.search}${location.hash}`,
      '/user',
    );
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`, {
      replace: true,
      delay: 0,
    });
  }, [isAuthResolved, location.hash, location.pathname, location.search, navigate, user.id]);

  return {
    user,
    isReady: isAuthResolved && user.id > 0,
  };
}
